import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Lock, Unlock } from 'lucide-react';
import Header from '@/components/Header';

export default function AdminAffiliatesManagement() {
  const [, setLocation] = useLocation();
  const [selectedAffiliate, setSelectedAffiliate] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditEmailDialog, setShowEditEmailDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const affiliatesQuery = trpc.admin.getAllAffiliates.useQuery();
  const blockMutation = trpc.admin.blockAffiliate.useMutation();
  const reactivateMutation = trpc.admin.reactivateAffiliate.useMutation();
  const deleteMutation = trpc.admin.deleteAffiliate.useMutation();
  const updateEmailMutation = trpc.admin.updateAffiliateEmail.useMutation();
  const resetPasswordMutation = trpc.admin.resetAffiliatePasswordByAdmin.useMutation();

  const handleBlock = async (affiliateId: number) => {
    try {
      await blockMutation.mutateAsync({ affiliateId });
      toast.success('Afiliado bloqueado com sucesso!');
      affiliatesQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao bloquear afiliado');
    }
  };

  const handleReactivate = async (affiliateId: number) => {
    try {
      await reactivateMutation.mutateAsync({ affiliateId });
      toast.success('Afiliado reativado com sucesso!');
      affiliatesQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao reativar afiliado');
    }
  };

  const handleDelete = async () => {
    if (!selectedAffiliate) return;
    try {
      await deleteMutation.mutateAsync({ affiliateId: selectedAffiliate.id });
      toast.success('Afiliado excluído com sucesso!');
      setShowDeleteDialog(false);
      setSelectedAffiliate(null);
      affiliatesQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir afiliado');
    }
  };

  const handleUpdateEmail = async () => {
    if (!selectedAffiliate || !newEmail) return;
    try {
      await updateEmailMutation.mutateAsync({ 
        affiliateId: selectedAffiliate.id, 
        newEmail 
      });
      toast.success('Email atualizado com sucesso!');
      setShowEditEmailDialog(false);
      setNewEmail('');
      setSelectedAffiliate(null);
      affiliatesQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar email');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedAffiliate || !newPassword) return;
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/.test(newPassword)) {
      toast.error('Use 6 ou mais caracteres, com maiúscula, minúscula, número e caractere especial');
      return;
    }
    try {
      await resetPasswordMutation.mutateAsync({ 
        affiliateId: selectedAffiliate.id, 
        newPassword 
      });
      toast.success('Senha redefinida com sucesso!');
      setShowResetPasswordDialog(false);
      setNewPassword('');
      setSelectedAffiliate(null);
      affiliatesQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao redefinir senha');
    }
  };

  if (affiliatesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Carregando afiliados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header title="Gerenciamento de Afiliados" userType="admin" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <Card className="bg-black border-gold/20 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gold/20">
              <TableHead className="text-gold">Nome</TableHead>
              <TableHead className="text-gold">Email</TableHead>
              <TableHead className="text-gold">Número de Agente</TableHead>
              <TableHead className="text-gold">Status</TableHead>
              <TableHead className="text-gold">Data de Registro</TableHead>
              <TableHead className="text-gold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {affiliatesQuery.data?.map((affiliate: any) => (
              <TableRow key={affiliate.id} className="border-gold/10 hover:bg-gold/5">
                <TableCell className="text-white">{affiliate.name}</TableCell>
                <TableCell className="text-gray-300">{affiliate.email}</TableCell>
                <TableCell className="text-gray-300">{affiliate.agentNumber || '-'}</TableCell>
                <TableCell>
                  <Badge variant={affiliate.isActive ? 'default' : 'secondary'}>
                    {affiliate.isActive ? 'Ativo' : 'Bloqueado'}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300">
                  {new Date(affiliate.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {/* Edit Email */}
                    <Dialog open={showEditEmailDialog && selectedAffiliate?.id === affiliate.id} onOpenChange={(open) => {
                      if (!open) {
                        setShowEditEmailDialog(false);
                        setSelectedAffiliate(null);
                        setNewEmail('');
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gold/30 text-gold hover:bg-gold/10"
                          onClick={() => {
                            setSelectedAffiliate(affiliate);
                            setNewEmail(affiliate.email);
                            setShowEditEmailDialog(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-black border-gold/20">
                        <DialogHeader>
                          <DialogTitle className="text-gold">Alterar Email</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            type="email"
                            placeholder="Novo email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="bg-black border-gold/30 text-white"
                          />
                          <Button
                            onClick={handleUpdateEmail}
                            className="w-full bg-gold text-black hover:bg-gold/90"
                          >
                            Atualizar Email
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Reset Password */}
                    <Dialog open={showResetPasswordDialog && selectedAffiliate?.id === affiliate.id} onOpenChange={(open) => {
                      if (!open) {
                        setShowResetPasswordDialog(false);
                        setSelectedAffiliate(null);
                        setNewPassword('');
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gold/30 text-gold hover:bg-gold/10"
                          onClick={() => {
                            setSelectedAffiliate(affiliate);
                            setShowResetPasswordDialog(true);
                          }}
                        >
                          🔑
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-black border-gold/20">
                        <DialogHeader>
                          <DialogTitle className="text-gold">Redefinir Senha</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            type="password"
                            placeholder="Nova senha (mínimo 6 caracteres)"
                            minLength={6}
                            pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{6,}"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-black border-gold/30 text-white"
                          />
                          <Button
                            onClick={handleResetPassword}
                            className="w-full bg-gold text-black hover:bg-gold/90"
                          >
                            Redefinir Senha
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Block/Reactivate */}
                    {affiliate.isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                        onClick={() => handleBlock(affiliate.id)}
                      >
                        <Lock className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500/30 text-green-500 hover:bg-green-500/10"
                        onClick={() => handleReactivate(affiliate.id)}
                      >
                        <Unlock className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Delete */}
                    <AlertDialog open={showDeleteDialog && selectedAffiliate?.id === affiliate.id} onOpenChange={(open) => {
                      if (!open) {
                        setShowDeleteDialog(false);
                        setSelectedAffiliate(null);
                      }
                    }}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                        onClick={() => {
                          setSelectedAffiliate(affiliate);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <AlertDialogContent className="bg-black border-gold/20">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-gold">Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-400">
                            Tem certeza que deseja excluir o afiliado {selectedAffiliate?.name}? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex gap-2">
                          <AlertDialogCancel className="border-gold/30 text-gold hover:bg-gold/10">
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-500 text-white hover:bg-red-600"
                          >
                            Excluir
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {(!affiliatesQuery.data || affiliatesQuery.data.length === 0) && (
        <Card className="bg-black border-gold/20 p-8 text-center">
          <p className="text-gray-400">Nenhum afiliado encontrado</p>
        </Card>
      )}
      </div>
    </div>
  );
}
