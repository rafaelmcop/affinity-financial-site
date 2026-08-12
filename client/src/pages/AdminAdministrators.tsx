import { useState } from 'react';
import { useLocation } from 'wouter';
import { Edit2, ShieldCheck, UserCog, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import AdminSidebar from '@/components/AdminSidebar';

type AdminRole = 'master' | 'standard';
type AdminForm = { id: number; name: string; email: string; phone: string; adminRole: AdminRole; password: string };

const emptyAdmin = { name: '', email: '', phone: '', adminRole: 'standard' as AdminRole, password: '' };

function RoleSelect({ value, onChange, disabled = false }: { value: AdminRole; onChange: (value: AdminRole) => void; disabled?: boolean }) {
  return (
    <select value={value} onChange={event => onChange(event.target.value as AdminRole)} disabled={disabled} className="h-10 rounded-md border border-gold/30 bg-black px-3 text-white disabled:cursor-not-allowed disabled:opacity-60">
      <option value="standard">Administrador padrão</option>
      <option value="master">Administrador mestre</option>
    </select>
  );
}

export default function AdminAdministrators() {
  const [, setLocation] = useLocation();
  const adminsQuery = trpc.admin.listAdmins.useQuery();
  const createMutation = trpc.admin.createAdmin.useMutation();
  const updateMutation = trpc.admin.updateAdmin.useMutation();
  const changePasswordMutation = trpc.admin.changeMyPassword.useMutation();
  const setActiveMutation = trpc.admin.setAdminActive.useMutation();
  const [newAdmin, setNewAdmin] = useState(emptyAdmin);
  const [editing, setEditing] = useState<AdminForm | null>(null);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmation: '' });

  const data = adminsQuery.data;
  const admins = data?.admins || [];
  const isMaster = data?.currentRole === 'master';

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmation) return toast.error('As novas senhas não coincidem');
    try {
      await changePasswordMutation.mutateAsync({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: '', newPassword: '', confirmation: '' });
      toast.success('Sua senha foi alterada');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível alterar a senha'); }
  };

  const handleCreateAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await createMutation.mutateAsync(newAdmin);
      setNewAdmin(emptyAdmin);
      await adminsQuery.refetch();
      toast.success('Administrador criado');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível criar o administrador'); }
  };

  const handleUpdateAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    try {
      const result = await updateMutation.mutateAsync(editing);
      setEditing(null);
      await adminsQuery.refetch();
      toast.success('Dados do administrador atualizados');
      if (result.emailChanged) {
        localStorage.removeItem('adminSession');
        toast.info('Entre novamente usando o novo e-mail');
        setLocation('/admin/login');
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o administrador'); }
  };

  return (
    <div className="min-h-screen bg-black text-white lg:pl-64">
      <AdminSidebar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.2em] text-gold">Segurança</p>
          <h1 className="mt-2 text-3xl font-bold">Administradores</h1>
          <p className="mt-2 text-gray-400">Gerencie os dados e o nível de acesso das pessoas que entram no portal.</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-4 py-2 text-sm text-gold">
            {isMaster ? <ShieldCheck size={17} /> : <UserCog size={17} />}
            Seu acesso: {isMaster ? 'Administrador mestre' : 'Administrador padrão'}
          </div>
        </div>

        <Card className="border-gold/20 bg-[#0b1524] p-6">
          <h2 className="mb-2 text-xl font-bold text-gold">Trocar minha senha</h2>
          <p className="mb-4 text-sm text-gray-400">Todos os administradores podem trocar a própria senha informando a senha atual.</p>
          <form onSubmit={handlePasswordChange} className="grid gap-3 md:grid-cols-3">
            <Input type="password" placeholder="Senha atual" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
            <Input type="password" placeholder="Nova senha forte" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} minLength={6} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{6,}" title="Inclua maiúscula, minúscula, número e caractere especial" required />
            <Input type="password" placeholder="Confirmar nova senha" value={passwords.confirmation} onChange={e => setPasswords({ ...passwords, confirmation: e.target.value })} minLength={6} required />
            <Button type="submit" className="bg-gold text-black md:col-span-3">Salvar minha nova senha</Button>
          </form>
        </Card>

        {editing && (
          <Card className="border-gold/30 bg-[#101b2b] p-6">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold text-gold">Editar administrador</h2><button type="button" onClick={() => setEditing(null)} className="text-gray-400 hover:text-white" aria-label="Fechar"><X size={20} /></button></div>
            <form onSubmit={handleUpdateAdmin} className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Nome" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} required />
              <Input type="email" placeholder="E-mail" value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} required />
              <Input type="tel" placeholder="Telefone" value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })} />
              <RoleSelect value={editing.adminRole} onChange={adminRole => setEditing({ ...editing, adminRole })} disabled={!isMaster} />
              <Input className="md:col-span-2" type="password" placeholder={isMaster ? 'Nova senha (deixe vazio para manter)' : 'Use “Trocar minha senha” acima'} value={editing.password} onChange={e => setEditing({ ...editing, password: e.target.value })} disabled={!isMaster} minLength={editing.password ? 6 : undefined} />
              <div className="flex gap-3 md:col-span-2"><Button type="submit" className="bg-gold text-black">Salvar alterações</Button><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button></div>
            </form>
          </Card>
        )}

        {isMaster && (
          <Card className="border-gold/20 bg-[#0b1524] p-6">
            <h2 className="mb-2 text-xl font-bold text-gold">Adicionar administrador</h2>
            <p className="mb-4 text-sm text-gray-400">Administradores padrão não podem alterar outros administradores. Mestres possuem controle completo.</p>
            <form onSubmit={handleCreateAdmin} className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Nome" value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} required />
              <Input type="email" placeholder="E-mail" value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} required />
              <Input type="tel" placeholder="Telefone" value={newAdmin.phone} onChange={e => setNewAdmin({ ...newAdmin, phone: e.target.value })} />
              <RoleSelect value={newAdmin.adminRole} onChange={adminRole => setNewAdmin({ ...newAdmin, adminRole })} />
              <Input className="md:col-span-2" type="password" placeholder="Senha forte" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} minLength={6} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{6,}" title="Inclua maiúscula, minúscula, número e caractere especial" required />
              <Button type="submit" className="bg-gold text-black md:col-span-2">Criar administrador</Button>
            </form>
          </Card>
        )}

        <div className="grid gap-4">
          {admins.map(admin => {
            const canEdit = isMaster || admin.email.toLowerCase() === data?.currentEmail.toLowerCase();
            return (
              <Card key={admin.id} className="border-gold/20 bg-[#0b1524] p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3"><p className="text-lg font-bold">{admin.name}</p><span className={`rounded-full px-3 py-1 text-xs font-bold ${admin.adminRole === 'master' ? 'bg-gold/15 text-gold' : 'bg-blue-500/15 text-blue-300'}`}>{admin.adminRole === 'master' ? 'Mestre' : 'Padrão'}</span><span className={`rounded-full px-3 py-1 text-xs ${admin.isActive ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>{admin.isActive ? 'Ativo' : 'Bloqueado'}</span></div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-400"><span>{admin.email}</span><span>{admin.phone || 'Telefone não informado'}</span></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canEdit && <Button variant="outline" onClick={() => setEditing({ id: admin.id, name: admin.name, email: admin.email, phone: admin.phone || '', adminRole: admin.adminRole, password: '' })}><Edit2 size={16} className="mr-2" />Editar</Button>}
                    {isMaster && admin.email.toLowerCase() !== data?.currentEmail.toLowerCase() && <Button variant="outline" onClick={async () => { try { await setActiveMutation.mutateAsync({ id: admin.id, isActive: !admin.isActive }); await adminsQuery.refetch(); toast.success(admin.isActive ? 'Administrador bloqueado' : 'Administrador ativado'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro'); } }}>{admin.isActive ? 'Bloquear' : 'Ativar'}</Button>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
