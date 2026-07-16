import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { LogOut, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');

  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (!adminSession) {
      setLocation('/admin/login');
      return;
    }
    setIsAuthenticated(true);
    setIsLoading(false);
  }, [setLocation]);

  const statsQuery = trpc.admin.getStats.useQuery();
  const policiesQuery = trpc.admin.getPoliciesPending.useQuery();

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

  const stats = statsQuery.data || {
    totalAffiliates: 0,
    totalPolicies: 0,
    totalCommissions: 0,
    pendingAffiliates: 0,
    pendingPolicies: 0,
    approvedPolicies: 0,
  };

  const pendingPolicies = policiesQuery.data || [];

  // Mock data for charts
  const conversionData = [
    { month: 'Jan', conversions: 12, target: 20 },
    { month: 'Fev', conversions: 19, target: 20 },
    { month: 'Mar', conversions: 15, target: 20 },
    { month: 'Abr', conversions: 25, target: 20 },
    { month: 'Mai', conversions: 22, target: 20 },
    { month: 'Jun', conversions: 28, target: 20 },
  ];

  const commissionData = [
    { affiliate: 'Afiliado A', commission: 2500 },
    { affiliate: 'Afiliado B', commission: 1800 },
    { affiliate: 'Afiliado C', commission: 3200 },
    { affiliate: 'Afiliado D', commission: 2100 },
  ];

  const policyStatusData = [
    { name: 'Aprovadas', value: stats.approvedPolicies, color: '#d4af37' },
    { name: 'Pendentes', value: stats.pendingPolicies, color: '#666' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    toast.success('Logout realizado');
    setLocation('/admin/login');
  };

  return (
    <div className="min-h-screen bg-black pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gold mb-2">Dashboard de Administração</h1>
            <p className="text-gray-400">Visão geral do desempenho da plataforma</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-gold/30 text-gold hover:bg-gold/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-black border-gold/20 p-6">
            <p className="text-gray-400 text-sm mb-2">Total de Afiliados</p>
            <p className="text-3xl font-bold text-gold">{stats.totalAffiliates}</p>
            <p className="text-xs text-gold/60 mt-2">{stats.pendingAffiliates} pendentes</p>
          </Card>

          <Card className="bg-black border-gold/20 p-6">
            <p className="text-gray-400 text-sm mb-2">Total de Apólices</p>
            <p className="text-3xl font-bold text-gold">{stats.totalPolicies}</p>
            <p className="text-xs text-gold/60 mt-2">{stats.pendingPolicies} pendentes</p>
          </Card>

          <Card className="bg-black border-gold/20 p-6">
            <p className="text-gray-400 text-sm mb-2">Comissões Pagas</p>
            <p className="text-3xl font-bold text-gold">${stats.totalCommissions.toFixed(0)}</p>
            <p className="text-xs text-gold/60 mt-2">Este mês</p>
          </Card>

          <Card className="bg-black border-gold/20 p-6 border-2 border-gold">
            <p className="text-gray-400 text-sm mb-2">Apólices Aprovadas</p>
            <p className="text-3xl font-bold text-gold">{stats.approvedPolicies}</p>
            <p className="text-xs text-gold/60 mt-2">Taxa de sucesso</p>
          </Card>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-8">
          {(['7', '30', '90'] as const).map((period) => (
            <Button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              className={selectedPeriod === period ? 'bg-gold text-black' : 'border-gold/30 text-gold'}
            >
              Últimos {period} dias
            </Button>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Conversions Chart */}
          <Card className="bg-black border-gold/20 p-6">
            <h2 className="text-xl font-semibold text-gold mb-4">Conversões por Mês</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #d4af37' }} />
                <Legend />
                <Line type="monotone" dataKey="conversions" stroke="#d4af37" strokeWidth={2} />
                <Line type="monotone" dataKey="target" stroke="#666" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Commission by Affiliate */}
          <Card className="bg-black border-gold/20 p-6">
            <h2 className="text-xl font-semibold text-gold mb-4">Comissões por Afiliado</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={commissionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #d4af37' }} />
                <Bar dataKey="commission" fill="#d4af37" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Policy Status & Pending Policies */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Status Pie Chart */}
          <Card className="bg-black border-gold/20 p-6">
            <h2 className="text-xl font-semibold text-gold mb-4">Status das Apólices</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={policyStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#d4af37"
                  dataKey="value"
                >
                  {policyStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #d4af37' }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Pending Policies List */}
          <Card className="bg-black border-gold/20 p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-gold mb-4">Apólices Pendentes de Aprovação</h2>
            {pendingPolicies.length === 0 ? (
              <p className="text-gray-400">Nenhuma apólice pendente</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pendingPolicies.map((policy: any) => (
                  <div key={policy.id} className="flex items-center justify-between p-3 bg-gold/5 border border-gold/10 rounded">
                    <div className="flex-1">
                      <p className="text-white font-semibold">{policy.policyNumber}</p>
                      <p className="text-gray-400 text-sm">{policy.clientName}</p>
                    </div>
                    <Clock className="text-gold w-5 h-5" />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-black border-gold/20 p-6">
          <h2 className="text-xl font-semibold text-gold mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => setLocation('/admin/afiliados')}
              className="bg-gold text-black hover:bg-gold/90 font-semibold"
            >
              Gerenciar Afiliados
            </Button>
            <Button
              variant="outline"
              className="border-gold/30 text-gold hover:bg-gold/10"
            >
              Aprovar Apólices
            </Button>
            <Button
              variant="outline"
              className="border-gold/30 text-gold hover:bg-gold/10"
            >
              Gerar Relatório
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
