import { useMemo, useState } from 'react';
import { Edit2, Search, ShieldCheck, UserPlus, Users, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import AdminSidebar from '@/components/AdminSidebar';

type AccountType = 'admin' | 'agent' | 'both';
type AccessSelection = AccountType | 'none';
type AdminRole = 'master' | 'standard';
type UserForm = { id: number; name: string; email: string; phone: string; contactEmail: string; whatsapp: string; accountType: AccountType; adminRole: AdminRole; password: string };
type NewUserForm = Omit<UserForm, 'id' | 'accountType'> & { accountType: AccessSelection; accessAffiliate: boolean };
const emptyUser: NewUserForm = { name: '', email: '', phone: '', contactEmail: '', whatsapp: '', accountType: 'agent', accessAffiliate: false, adminRole: 'standard', password: '' };

function AccessPicker({ value, onChange, affiliate, onAffiliateChange, disabled }: { value: AccessSelection; onChange: (value: AccessSelection) => void; affiliate?: boolean; onAffiliateChange?: (value: boolean) => void; disabled?: boolean }) {
  const admin = value === 'admin' || value === 'both';
  const agent = value === 'agent' || value === 'both';
  const change = (nextAdmin: boolean, nextAgent: boolean) => {
    if (!nextAdmin && !nextAgent && !affiliate) return toast.error('Escolha pelo menos um portal');
    onChange(nextAdmin && nextAgent ? 'both' : nextAdmin ? 'admin' : nextAgent ? 'agent' : 'none');
  };
  return <div className="rounded-lg border border-gold/20 bg-black/40 p-4">
    <p className="mb-3 text-sm font-semibold text-gold">O que este usuário pode acessar?</p>
    <div className="flex flex-wrap gap-5 text-sm">
      <label className="flex items-center gap-2"><input className="h-4 w-4 accent-[#d4af37]" type="checkbox" checked={admin} disabled={disabled} onChange={e => change(e.target.checked, agent)} /> Painel administrativo</label>
      <label className="flex items-center gap-2"><input className="h-4 w-4 accent-[#d4af37]" type="checkbox" checked={agent} disabled={disabled} onChange={e => change(admin, e.target.checked)} /> Portal do agente</label>
      {onAffiliateChange && <label className="flex items-center gap-2"><input className="h-4 w-4 accent-[#d4af37]" type="checkbox" checked={affiliate} disabled={disabled} onChange={e => { if (!e.target.checked && value === 'none') return toast.error('Escolha pelo menos um portal'); onAffiliateChange(e.target.checked); }} /> Portal do afiliado</label>}
    </div>
  </div>;
}

export default function AdminUsers() {
  const admins = trpc.admin.listAdmins.useQuery();
  const affiliates = trpc.admin.getAllAffiliates.useQuery();
  const createUser = trpc.admin.createUnifiedUser.useMutation();
  const updateUser = trpc.admin.updateAdmin.useMutation();
  const updateAffiliateCategories = trpc.admin.updateAffiliateCategories.useMutation();
  const setActive = trpc.admin.setAdminActive.useMutation();
  const blockAffiliate = trpc.admin.blockAffiliate.useMutation();
  const reactivateAffiliate = trpc.admin.reactivateAffiliate.useMutation();
  const [filter, setFilter] = useState<'all' | 'admin' | 'agent' | 'affiliate'>('agent');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState(emptyUser);
  const [editing, setEditing] = useState<UserForm | null>(null);
  const [editingAffiliate, setEditingAffiliate] = useState<{ id: number; name: string; email: string; accountType: AccessSelection; accessAffiliate: boolean; adminRole: AdminRole } | null>(null);
  const data = admins.data;
  const isMaster = data?.currentRole === 'master';
  const matchedInternal = data?.admins.find(user => user.email.toLowerCase() === newUser.email.trim().toLowerCase());

  const users = useMemo(() => {
    const term = search.trim().toLowerCase();
    const internal = (data?.admins || []).map(user => ({ kind: 'internal' as const, ...user }));
    const affiliateUsers = (affiliates.data || []).map((user: any) => ({ kind: 'affiliate' as const, ...user }));
    return [...internal, ...affiliateUsers].filter(user => {
      const found = !term || String(user.name || '').toLowerCase().includes(term) || String(user.email || '').toLowerCase().includes(term);
      const role = filter === 'all' || (filter === 'affiliate' ? user.kind === 'affiliate' : user.kind === 'internal' && (user.accountType === filter || user.accountType === 'both'));
      return found && role;
    });
  }, [affiliates.data, data?.admins, filter, search]);

  const saveNew = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (matchedInternal && !newUser.accessAffiliate) {
        const alreadyAdmin = matchedInternal.accountType === 'admin' || matchedInternal.accountType === 'both';
        const alreadyAgent = matchedInternal.accountType === 'agent' || matchedInternal.accountType === 'both';
        const accessAdmin = alreadyAdmin || newUser.accountType === 'admin' || newUser.accountType === 'both';
        const accessAgent = alreadyAgent || newUser.accountType === 'agent' || newUser.accountType === 'both';
        await updateUser.mutateAsync({ id: matchedInternal.id, name: matchedInternal.name, email: matchedInternal.email, phone: matchedInternal.phone || '', contactEmail: matchedInternal.contactEmail || '', whatsapp: matchedInternal.whatsapp || '', accountType: accessAdmin && accessAgent ? 'both' : accessAdmin ? 'admin' : 'agent', adminRole: matchedInternal.adminRole, password: '' });
        setNewUser(emptyUser); setCreating(false); await admins.refetch(); toast.success('Novo acesso adicionado à conta existente');
        return;
      }
      const result = await createUser.mutateAsync({ ...newUser, accessAdmin: newUser.accountType === 'admin' || newUser.accountType === 'both', accessAgent: newUser.accountType === 'agent' || newUser.accountType === 'both', accessAffiliate: newUser.accessAffiliate });
      setNewUser(emptyUser); setCreating(false); await Promise.all([admins.refetch(), affiliates.refetch()]); toast.success(result.updatedExisting ? 'Novos acessos adicionados à conta existente' : 'Usuário criado com os acessos selecionados');
    }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível criar o usuário'); }
  };
  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!editing) return;
    try { await updateUser.mutateAsync(editing); setEditing(null); await admins.refetch(); toast.success('Usuário atualizado'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o usuário'); }
  };
  const saveAffiliateCategories = async (event: React.FormEvent) => {
    event.preventDefault(); if (!editingAffiliate) return;
    try {
      await updateAffiliateCategories.mutateAsync({ affiliateId: editingAffiliate.id, accessAdmin: editingAffiliate.accountType === 'admin' || editingAffiliate.accountType === 'both', accessAgent: editingAffiliate.accountType === 'agent' || editingAffiliate.accountType === 'both', accessAffiliate: editingAffiliate.accessAffiliate, adminRole: editingAffiliate.adminRole });
      setEditingAffiliate(null); await Promise.all([admins.refetch(), affiliates.refetch()]); toast.success('Categorias do afiliado atualizadas');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível alterar as categorias'); }
  };

  return <div className="min-h-screen bg-black text-white lg:pl-64">
    <AdminSidebar />
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="text-sm font-semibold uppercase tracking-[.2em] text-gold">Acessos e cargos</p><h1 className="mt-2 text-3xl font-bold">Usuários</h1><p className="mt-2 max-w-2xl text-gray-400">Afiliados, agentes e administradores em um só lugar. Uma pessoa pode acessar o painel administrativo, o portal do agente ou ambos.</p></div>
        <div className="text-right"><Button disabled={!isMaster || admins.isLoading} onClick={() => setCreating(value => !value)} className="bg-gold text-black disabled:opacity-60"><UserPlus className="mr-2 h-4 w-4" />Adicionar usuário</Button>{!admins.isLoading && !isMaster && <p className="mt-2 text-xs text-amber-300">Disponível somente para administrador mestre.</p>}</div>
      </div>

      {creating && <Card className="border-gold/30 bg-[#101b2b] p-6"><FormTitle title="Novo usuário interno" close={() => setCreating(false)} /><form onSubmit={saveNew} className="grid gap-4 md:grid-cols-2">
        <Input placeholder="Nome" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required /><Input type="email" placeholder="E-mail de login" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
        <Input placeholder="Telefone" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} /><Input type="email" placeholder="E-mail pessoal" value={newUser.contactEmail} onChange={e => setNewUser({ ...newUser, contactEmail: e.target.value })} />
        <Input placeholder="WhatsApp" value={newUser.whatsapp} onChange={e => setNewUser({ ...newUser, whatsapp: e.target.value })} /><Input type="password" placeholder={matchedInternal && !newUser.accessAffiliate ? 'A senha atual será mantida' : 'Senha forte'} value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required={!matchedInternal || newUser.accessAffiliate} disabled={Boolean(matchedInternal && !newUser.accessAffiliate)} />
        {matchedInternal && !newUser.accessAffiliate && <div className="rounded-lg border border-green-500/25 bg-green-500/10 px-4 py-3 text-sm text-green-300 md:col-span-2">Conta existente encontrada: <strong>{matchedInternal.name}</strong>. O sistema apenas acrescentará os novos acessos, mantendo a senha atual.</div>}
        <div className="md:col-span-2"><AccessPicker value={newUser.accountType} affiliate={newUser.accessAffiliate} onAffiliateChange={accessAffiliate => setNewUser({ ...newUser, accessAffiliate })} onChange={accountType => setNewUser({ ...newUser, accountType, adminRole: accountType === 'agent' ? 'standard' : newUser.adminRole })} /></div>
        {(newUser.accountType === 'admin' || newUser.accountType === 'both') && <RoleSelect value={newUser.adminRole} onChange={adminRole => setNewUser({ ...newUser, adminRole })} />}
        <Button className="bg-gold text-black md:col-span-2">Criar usuário</Button>
      </form></Card>}

      {editing && <Card className="border-gold/30 bg-[#101b2b] p-6"><FormTitle title="Editar usuário" close={() => setEditing(null)} /><form onSubmit={saveEdit} className="grid gap-4 md:grid-cols-2">
        <Input placeholder="Nome" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} required /><Input type="email" placeholder="E-mail" value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} required />
        <Input placeholder="Telefone" value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })} /><Input type="email" placeholder="E-mail pessoal" value={editing.contactEmail} onChange={e => setEditing({ ...editing, contactEmail: e.target.value })} />
        <Input placeholder="WhatsApp" value={editing.whatsapp} onChange={e => setEditing({ ...editing, whatsapp: e.target.value })} /><Input type="password" placeholder="Nova senha (opcional)" value={editing.password} onChange={e => setEditing({ ...editing, password: e.target.value })} disabled={!isMaster} />
        <div className="md:col-span-2"><AccessPicker value={editing.accountType} onChange={accountType => accountType !== 'none' && setEditing({ ...editing, accountType, adminRole: accountType === 'agent' ? 'standard' : editing.adminRole })} disabled={!isMaster} /></div>
        {editing.accountType !== 'agent' && <RoleSelect value={editing.adminRole} onChange={adminRole => setEditing({ ...editing, adminRole })} disabled={!isMaster} />}
        <div className="flex gap-3 md:col-span-2"><Button className="bg-gold text-black">Salvar</Button><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button></div>
      </form></Card>}

      {editingAffiliate && <Card className="border-gold/30 bg-[#101b2b] p-6"><FormTitle title={`Alterar categoria de ${editingAffiliate.name}`} close={() => setEditingAffiliate(null)} /><form onSubmit={saveAffiliateCategories} className="grid gap-4">
        <p className="text-sm text-gray-400">Selecione exatamente os portais que essa pessoa poderá acessar. Remover o acesso de afiliado não apaga indicações nem comissões anteriores.</p>
        <AccessPicker value={editingAffiliate.accountType} affiliate={editingAffiliate.accessAffiliate} onAffiliateChange={accessAffiliate => setEditingAffiliate({ ...editingAffiliate, accessAffiliate })} onChange={accountType => setEditingAffiliate({ ...editingAffiliate, accountType })} />
        {(editingAffiliate.accountType === 'admin' || editingAffiliate.accountType === 'both') && <RoleSelect value={editingAffiliate.adminRole} onChange={adminRole => setEditingAffiliate({ ...editingAffiliate, adminRole })} />}
        <div className="flex gap-3"><Button className="bg-gold text-black">Salvar categorias</Button><Button type="button" variant="outline" onClick={() => setEditingAffiliate(null)}>Cancelar</Button></div>
      </form></Card>}

      <Card className="border-gold/20 bg-[#0b1524] p-4"><div className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail" className="pl-9" /></div><div className="flex flex-wrap gap-2">{([['agent','Agentes'],['affiliate','Afiliados'],['admin','Administradores'],['all','Todos']] as const).map(([value,label]) => <Button key={value} type="button" variant={filter === value ? 'default' : 'outline'} onClick={() => setFilter(value)} className={filter === value ? 'bg-gold text-black' : ''}>{label}</Button>)}</div></div></Card>

      <div className="grid gap-4">{users.map((user: any) => <Card key={`${user.kind}-${user.id}`} className="border-gold/20 bg-[#0b1524] p-5"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-lg font-bold">{user.name}</p><Badges user={user} /><span className={`rounded-full px-3 py-1 text-xs ${user.isActive ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>{user.isActive ? 'Ativo' : 'Bloqueado'}</span></div><p className="mt-2 text-sm text-gray-400">{user.email}{user.phone ? ` · ${user.phone}` : ''}</p></div><div className="flex flex-wrap gap-2">{user.kind === 'internal' && (isMaster || user.email.toLowerCase() === data?.currentEmail.toLowerCase()) && <Button variant="outline" onClick={() => setEditing({ id: user.id, name: user.name, email: user.email, phone: user.phone || '', contactEmail: user.contactEmail || '', whatsapp: user.whatsapp || '', accountType: user.accountType || 'admin', adminRole: user.adminRole, password: '' })}><Edit2 className="mr-2 h-4 w-4" />Editar acessos</Button>}{user.kind === 'affiliate' && isMaster && <Button variant="outline" onClick={() => { const internal = data?.admins.find(item => item.email.toLowerCase() === user.email.toLowerCase()); setEditingAffiliate({ id: user.id, name: user.name, email: user.email, accountType: internal?.isActive ? (internal.accountType || 'admin') : 'none', accessAffiliate: Boolean(user.isActive), adminRole: internal?.adminRole || 'standard' }); }}><Edit2 className="mr-2 h-4 w-4" />Alterar categoria</Button>}{isMaster && user.email.toLowerCase() !== data?.currentEmail.toLowerCase() && <Button variant="outline" onClick={async () => { try { if (user.kind === 'affiliate') user.isActive ? await blockAffiliate.mutateAsync({ affiliateId: user.id }) : await reactivateAffiliate.mutateAsync({ affiliateId: user.id }); else await setActive.mutateAsync({ id: user.id, isActive: !user.isActive }); await Promise.all([admins.refetch(), affiliates.refetch()]); toast.success(user.isActive ? 'Usuário bloqueado' : 'Usuário ativado'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao alterar acesso'); } }}>{user.isActive ? 'Bloquear' : 'Ativar'}</Button>}</div></div></Card>)}{!users.length && <Card className="border-gold/20 bg-[#0b1524] p-10 text-center text-gray-400"><Users className="mx-auto mb-3 h-8 w-8 text-gold" />Nenhum usuário encontrado.</Card>}</div>
    </main>
  </div>;
}

function FormTitle({ title, close }: { title: string; close: () => void }) { return <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold text-gold">{title}</h2><button type="button" onClick={close} aria-label="Fechar"><X /></button></div>; }
function RoleSelect({ value, onChange, disabled }: { value: AdminRole; onChange: (value: AdminRole) => void; disabled?: boolean }) { return <select value={value} onChange={e => onChange(e.target.value as AdminRole)} disabled={disabled} className="h-10 rounded-md border border-gold/30 bg-black px-3 text-white md:col-span-2"><option value="standard">Administrador padrão</option><option value="master">Administrador mestre</option></select>; }
function Badges({ user }: { user: any }) { if (user.kind === 'affiliate') return <span className={`rounded-full px-3 py-1 text-xs font-bold ${user.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-gray-500/15 text-gray-400'}`}>{user.isActive ? 'Afiliado' : 'Afiliado sem acesso'}</span>; return <>{(user.accountType === 'admin' || user.accountType === 'both') && <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-300">Administrador</span>}{(user.accountType === 'agent' || user.accountType === 'both') && <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-bold text-purple-300">Agente</span>}{user.adminRole === 'master' && <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-gold"><ShieldCheck className="mr-1 inline h-3 w-3" />Mestre</span>}</>; }
