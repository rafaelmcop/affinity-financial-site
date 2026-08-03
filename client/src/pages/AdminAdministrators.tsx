import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Header from '@/components/Header';
import { toast } from 'sonner';

export default function AdminAdministrators() {
  const [, setLocation] = useLocation();
  const admins = trpc.admin.listAdmins.useQuery();
  const createAdmin = trpc.admin.createAdmin.useMutation();
  const changePassword = trpc.admin.changeMyPassword.useMutation();
  const setActive = trpc.admin.setAdminActive.useMutation();
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmation: '' });

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmation) return toast.error('As novas senhas não coincidem');
    try {
      await changePassword.mutateAsync({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: '', newPassword: '', confirmation: '' });
      toast.success('Senha administrativa alterada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível alterar a senha');
    }
  };

  const handleCreateAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await createAdmin.mutateAsync(newAdmin);
      setNewAdmin({ name: '', email: '', password: '' });
      await admins.refetch();
      toast.success('Administrador criado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar o administrador');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header title="Administradores" userType="admin" />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Button variant="outline" onClick={() => setLocation('/admin/dashboard')}>Voltar ao painel</Button>

        <Card className="bg-black border-gold/20 p-6">
          <h2 className="text-xl font-bold text-gold mb-4">Trocar minha senha</h2>
          <form onSubmit={handlePasswordChange} className="grid md:grid-cols-3 gap-3">
            <Input type="password" placeholder="Senha atual" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
            <Input type="password" placeholder="Nova senha forte (mínimo 6)" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} minLength={6} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{6,}" title="Inclua maiúscula, minúscula, número e caractere especial" required />
            <Input type="password" placeholder="Confirmar nova senha" value={passwords.confirmation} onChange={e => setPasswords({ ...passwords, confirmation: e.target.value })} minLength={6} required />
            <Button type="submit" className="bg-gold text-black md:col-span-3">Salvar nova senha</Button>
          </form>
        </Card>

        <Card className="bg-black border-gold/20 p-6">
          <h2 className="text-xl font-bold text-gold mb-4">Adicionar administrador</h2>
          <form onSubmit={handleCreateAdmin} className="grid md:grid-cols-3 gap-3">
            <Input placeholder="Nome" value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} required />
            <Input type="email" placeholder="E-mail" value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} required />
            <Input type="password" placeholder="Senha forte (mínimo 6)" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} minLength={6} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{6,}" title="Inclua maiúscula, minúscula, número e caractere especial" required />
            <Button type="submit" className="bg-gold text-black md:col-span-3">Criar administrador</Button>
          </form>
        </Card>

        <Card className="bg-black border-gold/20 overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Status</TableHead><TableHead>Ação</TableHead></TableRow></TableHeader>
            <TableBody>
              {admins.data?.map(admin => (
                <TableRow key={admin.id}>
                  <TableCell>{admin.name}</TableCell><TableCell>{admin.email}</TableCell>
                  <TableCell>{admin.isActive ? 'Ativo' : 'Bloqueado'}</TableCell>
                  <TableCell><Button variant="outline" onClick={async () => { try { await setActive.mutateAsync({ id: admin.id, isActive: !admin.isActive }); await admins.refetch(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro'); } }}>{admin.isActive ? 'Bloquear' : 'Ativar'}</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}
