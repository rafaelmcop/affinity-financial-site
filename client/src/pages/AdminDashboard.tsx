import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { LogOut, CheckCircle, Clock, XCircle, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';

export default function AdminDashboard() {
  // All state declarations first
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');
  
  // Form states for adding policy
  const [policyForm, setPolicyForm] = useState({
    policyNumber: '',
    clientName: '',
    policyType: '',
    points: '',
    affiliateId: '',
    submissionDate: new Date().toISOString().split('T')[0],
  });

  // Filter states
  const [searchPolicyNumber, setSearchPolicyNumber] = useState('');
  const [searchClientName, setSearchClientName] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  // All hooks MUST be called unconditionally before any returns
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (!adminSession) {
      setLocation('/admin/login');
      return;
    }
    setIsAuthenticated(true);
    setIsLoading(false);
  }, [setLocation]);

  // All tRPC queries - called unconditionally
  const statsQuery = trpc.admin.getStats.useQuery();
  const policiesQuery = trpc.admin.getPoliciesPending.useQuery();
  const affiliatesQuery = trpc.admin.getPendingAffiliates.useQuery();
  const addPolicyMutation = trpc.admin.addPolicy.useMutation();
  const approvePolicyMutation = trpc.admin.approvePolicyAdmin.useMutation();
  const rejectPolicyMutation = trpc.admin.rejectPolicyAdmin.useMutation();
  const approveAffiliateMutation = trpc.admin.approveAffiliate.useMutation();
  const rejectAffiliateMutation = trpc.admin.rejectAffiliate.useMutation();

  // All useMemo hooks - called unconditionally
  const stats = useMemo(() => statsQuery.data || {
    totalAffiliates: 0,
    totalPolicies: 0,
    totalCommissions: 0,
    pendingAffiliates: 0,
    pendingPolicies: 0,
    approvedPolicies: 0,
  }, [statsQuery.data]);

  const allPolicies = useMemo(() => policiesQuery.data || [], [policiesQuery.data]);

  const filteredPolicies = useMemo(() => {
    return allPolicies.filter((policy: any) => {
      if (searchPolicyNumber && !policy.policyNumber.toLowerCase().includes(searchPolicyNumber.toLowerCase())) return false;
      if (searchClientName && !policy.clientName.toLowerCase().includes(searchClientName.toLowerCase())) return false;
      if (filterStatus !== 'all' && policy.status !== filterStatus) return false;
      if (filterDateStart) {
        const policyDate = new Date(policy.submittedAt).toISOString().split('T')[0];
        if (policyDate < filterDateStart) return false;
      }
      if (filterDateEnd) {
        const policyDate = new Date(policy.submittedAt).toISOString().split('T')[0];
        if (policyDate > filterDateEnd) return false;
      }
      return true;
    });
  }, [allPolicies, searchPolicyNumber, searchClientName, filterStatus, filterDateStart, filterDateEnd]);

  // Now we can have early returns after all hooks are called
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pt-16">
        <p className="text-gold">Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleClearFilters = () => {
    setSearchPolicyNumber('');
    setSearchClientName('');
    setFilterStatus('all');
    setFilterDateStart('');
    setFilterDateEnd('');
  };

  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    setLocation('/admin/login');
  };

  const handleApprovePolicy = async (policyId: number, points: number) => {
    try {
      await approvePolicyMutation.mutateAsync({ policyId, points });
      toast.success('Apólice aprovada!');
      policiesQuery.refetch();
      statsQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aprovar apólice');
    }
  };

  const handleRejectPolicy = async (policyId: number) => {
    try {
      await rejectPolicyMutation.mutateAsync({ policyId });
      toast.success('Apólice rejeitada!');
      policiesQuery.refetch();
      statsQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao rejeitar apólice');
    }
  };

  const handleAddPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!policyForm.policyNumber || !policyForm.clientName || !policyForm.points || !policyForm.affiliateId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await addPolicyMutation.mutateAsync({
        policyNumber: policyForm.policyNumber,
        clientName: policyForm.clientName,
        policyType: policyForm.policyType || 'Seguro de Vida',
        points: parseInt(policyForm.points),
        affiliateId: parseInt(policyForm.affiliateId),
      });
      
      toast.success('Apólice adicionada com sucesso!');
      setPolicyForm({ policyNumber: '', clientName: '', policyType: '', points: '', affiliateId: '', submissionDate: new Date().toISOString().split('T')[0] });
      policiesQuery.refetch();
      statsQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar apólice');
    }
  };

  const conversionData = [
    { month: 'Jan', conversions: 12 },
    { month: 'Fev', conversions: 19 },
    { month: 'Mar', conversions: 15 },
    { month: 'Abr', conversions: 25 },
    { month: 'Mai', conversions: 22 },
    { month: 'Jun', conversions: 30 },
  ];

  const commissionData = [
    { name: 'João Silva', commission: 2500 },
    { name: 'Maria Santos', commission: 3200 },
    { name: 'Pedro Costa', commission: 1800 },
    { name: 'Ana Oliveira', commission: 2800 },
  ];

  const policyStatusData = [
    { name: 'Pendentes', value: stats.pendingPolicies, fill: '#FCD34D' },
    { name: 'Aprovadas', value: stats.approvedPolicies, fill: '#10B981' },
    { name: 'Rejeitadas', value: 5, fill: '#EF4444' },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <Header title="Painel de Administração" userType="admin" showBackButton={false} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-8">
          <div></div>
          <div className="flex gap-3">
            <Button
              onClick={() => setLocation('/admin/affiliates')}
              variant="outline"
              className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border-purple-600/30 text-purple-400"
            >
              👥 Gerenciar Afiliados
            </Button>
            <Button
              onClick={() => setLocation('/admin/smtp-config')}
              variant="outline"
              className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border-blue-600/30 text-blue-400"
            >
              ⚙️ SMTP
            </Button>
            <Button
              onClick={() => setLocation('/admin/testimonials')}
              variant="outline"
              className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border-purple-600/30 text-purple-400"
            >
              💬 Depoimentos
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut size={18} />
              Logout
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gold/10 p-1 rounded-lg">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gold/20">Visão Geral</TabsTrigger>
            <TabsTrigger value="policies" className="data-[state=active]:bg-gold/20">Gerenciar Apólices</TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-gold/20">Apólices Pendentes</TabsTrigger>
            <TabsTrigger value="affiliates" className="data-[state=active]:bg-gold/20">Afiliados</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-gold/10 border-gold/20 p-6">
                <p className="text-gray-400 text-sm">Total de Afiliados</p>
                <p className="text-3xl font-bold text-gold mt-2">{stats.totalAffiliates}</p>
                <p className="text-xs text-gray-500 mt-2">{stats.pendingAffiliates} pendentes</p>
              </Card>
              <Card className="bg-gold/10 border-gold/20 p-6">
                <p className="text-gray-400 text-sm">Total de Apólices</p>
                <p className="text-3xl font-bold text-gold mt-2">{stats.totalPolicies}</p>
                <p className="text-xs text-gray-500 mt-2">{stats.pendingPolicies} pendentes</p>
              </Card>
              <Card className="bg-gold/10 border-gold/20 p-6">
                <p className="text-gray-400 text-sm">Comissões Totais</p>
                <p className="text-3xl font-bold text-gold mt-2">R$ {stats.totalCommissions.toFixed(2)}</p>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gold/5 border-gold/20 p-6">
                <h3 className="text-white font-semibold mb-4">Conversões por Mês</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={conversionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis stroke="#999" />
                    <YAxis stroke="#999" />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #d4af37' }} />
                    <Legend />
                    <Line type="monotone" dataKey="conversions" stroke="#d4af37" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="bg-gold/5 border-gold/20 p-6">
                <h3 className="text-white font-semibold mb-4">Comissões por Afiliado</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={commissionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis stroke="#999" />
                    <YAxis stroke="#999" />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #d4af37' }} />
                    <Legend />
                    <Bar dataKey="commission" fill="#d4af37" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <Card className="bg-gold/5 border-gold/20 p-6">
              <h3 className="text-white font-semibold mb-4">Status das Apólices</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={policyStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {policyStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #d4af37' }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          {/* Manage Policies Tab */}
          <TabsContent value="policies" className="space-y-6">
            <Card className="bg-gold/5 border-gold/20 p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Plus size={20} />
                Adicionar Nova Apólice
              </h3>
              <form onSubmit={handleAddPolicy} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Número da Apólice *</label>
                    <Input
                      type="text"
                      placeholder="Ex: POL-2024-001"
                      value={policyForm.policyNumber}
                      onChange={(e) => setPolicyForm({ ...policyForm, policyNumber: e.target.value })}
                      className="bg-black border-gold/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Nome do Cliente *</label>
                    <Input
                      type="text"
                      placeholder="Ex: João Silva"
                      value={policyForm.clientName}
                      onChange={(e) => setPolicyForm({ ...policyForm, clientName: e.target.value })}
                      className="bg-black border-gold/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Tipo de Apólice</label>
                    <Input
                      type="text"
                      placeholder="Ex: Seguro de Vida"
                      value={policyForm.policyType}
                      onChange={(e) => setPolicyForm({ ...policyForm, policyType: e.target.value })}
                      className="bg-black border-gold/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Pontos *</label>
                    <Input
                      type="number"
                      placeholder="Ex: 100"
                      value={policyForm.points}
                      onChange={(e) => setPolicyForm({ ...policyForm, points: e.target.value })}
                      className="bg-black border-gold/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Afiliado Responsável *</label>
                    <select
                      value={policyForm.affiliateId}
                      onChange={(e) => setPolicyForm({ ...policyForm, affiliateId: e.target.value })}
                      className="w-full bg-black border border-gold/20 text-white rounded px-3 py-2"
                    >
                      <option value="">Selecione um afiliado...</option>
                      {affiliatesQuery.data?.map((affiliate: any) => (
                        <option key={affiliate.id} value={affiliate.id}>
                          {affiliate.name} ({affiliate.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Data de Submissão</label>
                    <Input
                      type="date"
                      value={policyForm.submissionDate}
                      onChange={(e) => setPolicyForm({ ...policyForm, submissionDate: e.target.value })}
                      className="bg-black border-gold/20 text-white"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="bg-gold text-black hover:bg-gold/90 w-full"
                  disabled={addPolicyMutation.isPending}
                >
                  {addPolicyMutation.isPending ? 'Adicionando...' : 'Adicionar Apólice'}
                </Button>
              </form>
            </Card>
          </TabsContent>

          {/* Pending Policies Tab */}
          <TabsContent value="pending" className="space-y-6">
            <Card className="bg-gold/5 border-gold/20 p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Clock size={20} className="text-yellow-500" />
                Apólices Pendentes de Aprovação
              </h3>
              
              {/* Filters */}
              <div className="mb-6 space-y-4 bg-black/50 p-4 rounded-lg border border-gold/10">
                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Número da Apólice</label>
                    <Input
                      type="text"
                      placeholder="Pesquisar..."
                      value={searchPolicyNumber}
                      onChange={(e) => setSearchPolicyNumber(e.target.value)}
                      className="bg-black border-gold/20 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Nome do Cliente</label>
                    <Input
                      type="text"
                      placeholder="Pesquisar..."
                      value={searchClientName}
                      onChange={(e) => setSearchClientName(e.target.value)}
                      className="bg-black border-gold/20 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="w-full bg-black border border-gold/20 text-white text-sm rounded px-2 py-1.5"
                    >
                      <option value="all">Todos</option>
                      <option value="pending">Pendente</option>
                      <option value="approved">Aprovada</option>
                      <option value="rejected">Rejeitada</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">De</label>
                    <Input
                      type="date"
                      value={filterDateStart}
                      onChange={(e) => setFilterDateStart(e.target.value)}
                      className="bg-black border-gold/20 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Até</label>
                    <Input
                      type="date"
                      value={filterDateEnd}
                      onChange={(e) => setFilterDateEnd(e.target.value)}
                      className="bg-black border-gold/20 text-white text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleClearFilters}
                    variant="outline"
                    className="text-gold border-gold/30 hover:bg-gold/10"
                    size="sm"
                  >
                    <X size={16} className="mr-1" />
                    Limpar Filtros
                  </Button>
                  <span className="text-gold text-sm flex items-center ml-auto">
                    {filteredPolicies.length} resultado(s)
                  </span>
                </div>
              </div>
              
              {filteredPolicies.length === 0 ? (
                <p className="text-gray-400">Nenhuma apólice pendente</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gold/20">
                        <th className="text-left py-2 px-2 text-gray-400">Número</th>
                        <th className="text-left py-2 px-2 text-gray-400">Cliente</th>
                        <th className="text-left py-2 px-2 text-gray-400">Afiliado</th>
                        <th className="text-left py-2 px-2 text-gray-400">Data</th>
                        <th className="text-left py-2 px-2 text-gray-400">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPolicies.map((policy: any) => (
                        <tr key={policy.id} className="border-b border-gold/10 hover:bg-gold/5">
                          <td className="py-3 px-2 text-white">{policy.policyNumber}</td>
                          <td className="py-3 px-2 text-white">{policy.clientName}</td>
                          <td className="py-3 px-2 text-gray-400">{policy.affiliateName || 'N/A'}</td>
                          <td className="py-3 px-2 text-gray-400">
                            {new Date(policy.submittedAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-2 flex gap-2">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleApprovePolicy(policy.id, policy.points || 0)}
                              disabled={approvePolicyMutation.isPending}
                            >
                              <CheckCircle size={16} />
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => handleRejectPolicy(policy.id)}
                              disabled={rejectPolicyMutation.isPending}
                            >
                              <XCircle size={16} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Affiliates Tab */}
          <TabsContent value="affiliates" className="space-y-6">
            <Card className="bg-gold/5 border-gold/20 p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <CheckCircle size={20} className="text-yellow-500" />
                Gerenciar Afiliados
              </h3>
              <p className="text-gray-400 text-sm mb-4">Aqui você pode aceitar ou recusar novos afiliados pendentes de aprovação.</p>
              
              <div className="space-y-4">
                <Card className="bg-black/50 border-gold/10 p-4">
                  <p className="text-gray-400 text-sm mb-3">Afiliados Pendentes de Aprovação</p>
                  <p className="text-gold text-2xl font-bold">{stats.pendingAffiliates}</p>
                </Card>
                
                {affiliatesQuery.isLoading ? (
                  <p className="text-gray-400">Carregando afiliados...</p>
                ) : affiliatesQuery.data && affiliatesQuery.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gold/20">
                          <th className="text-left py-2 px-2 text-gray-400">Nome</th>
                          <th className="text-left py-2 px-2 text-gray-400">Email</th>
                          <th className="text-left py-2 px-2 text-gray-400">Status</th>
                          <th className="text-left py-2 px-2 text-gray-400">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {affiliatesQuery.data.map((affiliate: any) => (
                          <tr key={affiliate.id} className="border-b border-gold/10 hover:bg-gold/5">
                            <td className="py-3 px-2 text-white">{affiliate.name}</td>
                            <td className="py-3 px-2 text-white">{affiliate.email}</td>
                            <td className="py-3 px-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                affiliate.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                affiliate.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {affiliate.status === 'pending' ? 'Pendente' :
                                 affiliate.status === 'approved' ? 'Aprovado' :
                                 'Rejeitado'}
                              </span>
                            </td>
                            <td className="py-3 px-2 flex gap-2">
                              {affiliate.status === 'pending' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={async () => {
                                      const agentNumber = prompt('Digite o número de agente para este afiliado:');
                                      if (!agentNumber) {
                                        toast.error('Número de agente é obrigatório');
                                        return;
                                      }
                                      try {
                                        await approveAffiliateMutation.mutateAsync({ affiliateId: affiliate.id, agentNumber });
                                        toast.success('Afiliado aprovado!');
                                        affiliatesQuery.refetch();
                                        statsQuery.refetch();
                                      } catch (error: any) {
                                        toast.error(error.message || 'Erro ao aprovar afiliado');
                                      }
                                    }}
                                    disabled={approveAffiliateMutation.isPending}
                                  >
                                    <CheckCircle size={16} />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={async () => {
                                      try {
                                        await rejectAffiliateMutation.mutateAsync({ affiliateId: affiliate.id });
                                        toast.success('Afiliado rejeitado!');
                                        affiliatesQuery.refetch();
                                        statsQuery.refetch();
                                      } catch (error: any) {
                                        toast.error(error.message || 'Erro ao rejeitar afiliado');
                                      }
                                    }}
                                    disabled={rejectAffiliateMutation.isPending}
                                  >
                                    <XCircle size={16} />
                                  </Button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400">Nenhum afiliado pendente</p>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
