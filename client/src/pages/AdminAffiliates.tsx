import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Trash2, Power, Plus, Check, X } from 'lucide-react';

export default function AdminAffiliates() {
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    company: '',
    phone: '',
    commissionRate: 10,
  });

  const listQuery = trpc.affiliate.listAffiliates.useQuery();
  const updateStatusMutation = trpc.affiliate.updateAffiliateStatus.useMutation();
  const deleteMutation = trpc.affiliate.deleteAffiliate.useMutation();
  const approveMutation = trpc.affiliate.approveAffiliate.useMutation();
  const rejectMutation = trpc.affiliate.rejectAffiliate.useMutation();

  const handleCreateAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.info('Para criar afiliados manualmente, use a página de registro ou o painel de admin.');
  };

  const handleToggleStatus = async (affiliateId: number, currentStatus: number) => {
    try {
      await updateStatusMutation.mutateAsync({
        affiliateId,
        isActive: currentStatus === 1 ? 0 : 1,
      });
      toast.success('Status atualizado!');
      await listQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar status');
    }
  };

  const handleDeleteAffiliate = async (affiliateId: number) => {
    if (!confirm('Tem certeza que deseja deletar este afiliado?')) return;
    try {
      await deleteMutation.mutateAsync({ affiliateId });
      toast.success('Afiliado deletado!');
      await listQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar afiliado');
    }
  };

  const handleApprove = async (affiliateId: number) => {
    try {
      await approveMutation.mutateAsync({ affiliateId });
      toast.success('Afiliado aprovado!');
      await listQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao aprovar afiliado');
    }
  };

  const handleReject = async (affiliateId: number) => {
    try {
      await rejectMutation.mutateAsync({ affiliateId });
      toast.success('Afiliado rejeitado!');
      await listQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao rejeitar afiliado');
    }
  };

  const affiliates = (listQuery.data || []).filter(a => {
    if (filterStatus === 'all') return true;
    return a.status === filterStatus;
  });

  return (
    <div className="min-h-screen bg-black pt-20 px-4 pb-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-gold">Gerenciar Afiliados</h1>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-gold text-black hover:bg-gold/90 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Afiliado
          </Button>
        </div>

        <div className="mb-6 flex gap-2 flex-wrap">
          <Button
            onClick={() => setFilterStatus('all')}
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            className={filterStatus === 'all' ? 'bg-gold text-black' : 'border-gold/30 text-gold'}
          >
            Todos
          </Button>
          <Button
            onClick={() => setFilterStatus('pending')}
            variant={filterStatus === 'pending' ? 'default' : 'outline'}
            className={filterStatus === 'pending' ? 'bg-yellow-600 text-white' : 'border-yellow-600/30 text-yellow-600'}
          >
            Pendentes
          </Button>
          <Button
            onClick={() => setFilterStatus('approved')}
            variant={filterStatus === 'approved' ? 'default' : 'outline'}
            className={filterStatus === 'approved' ? 'bg-green-600 text-white' : 'border-green-600/30 text-green-600'}
          >
            Aprovados
          </Button>
          <Button
            onClick={() => setFilterStatus('rejected')}
            variant={filterStatus === 'rejected' ? 'default' : 'outline'}
            className={filterStatus === 'rejected' ? 'bg-red-600 text-white' : 'border-red-600/30 text-red-600'}
          >
            Rejeitados
          </Button>
        </div>



        <Card className="bg-black border-gold/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/20">
                  <th className="px-4 py-3 text-left text-gold font-semibold">Nome</th>
                  <th className="px-4 py-3 text-left text-gold font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-gold font-semibold">Código</th>
                  <th className="px-4 py-3 text-left text-gold font-semibold">Comissão</th>
                  <th className="px-4 py-3 text-left text-gold font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-gold font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Nenhum afiliado encontrado
                    </td>
                  </tr>
                ) : (
                  affiliates.map((affiliate) => (
                    <tr key={affiliate.id} className="border-b border-gold/10 hover:bg-gold/5">
                      <td className="px-4 py-3 text-white">{affiliate.name}</td>
                      <td className="px-4 py-3 text-white text-sm">{affiliate.email}</td>
                      <td className="px-4 py-3 text-gold text-sm font-mono">{affiliate.affiliateCode}</td>
                      <td className="px-4 py-3 text-white">{affiliate.commissionRate}%</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          affiliate.status === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
                          affiliate.status === 'approved' ? 'bg-green-600/20 text-green-400' :
                          'bg-red-600/20 text-red-400'
                        }`}>
                          {affiliate.status === 'pending' ? 'Pendente' :
                           affiliate.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {affiliate.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(affiliate.id)}
                                className="text-green-400 hover:text-green-300 transition"
                                title="Aprovar"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(affiliate.id)}
                                className="text-red-400 hover:text-red-300 transition"
                                title="Rejeitar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleToggleStatus(affiliate.id, affiliate.isActive)}
                            className="text-blue-400 hover:text-blue-300 transition"
                            title={affiliate.isActive === 1 ? 'Desativar' : 'Ativar'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAffiliate(affiliate.id)}
                            className="text-red-400 hover:text-red-300 transition"
                            title="Deletar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
