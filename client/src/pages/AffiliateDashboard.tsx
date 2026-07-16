import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Copy, LogOut, Plus } from 'lucide-react';

interface AffiliateSession {
  id: number;
  email: string;
  name: string;
  affiliateCode: string;
  commissionRate: string;
}

export default function AffiliateDashboard() {
  const [, setLocation] = useLocation();
  const [session, setSession] = useState<AffiliateSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    policyNumber: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    policyType: 'Seguro de Vida',
  });

  const dashboardQuery = trpc.affiliate.getDashboard.useQuery(
    session ? { affiliateId: session.id } : { affiliateId: 0 },
    { enabled: !!session }
  );

  useEffect(() => {
    const storedSession = localStorage.getItem('affiliateSession');
    if (!storedSession) {
      setLocation('/afiliados');
      return;
    }

    try {
      const parsed = JSON.parse(storedSession) as AffiliateSession;
      setSession(parsed);
    } catch (error) {
      localStorage.removeItem('affiliateSession');
      setLocation('/afiliados');
    } finally {
      setIsLoading(false);
    }
  }, [setLocation]);

  const handleLogout = () => {
    localStorage.removeItem('affiliateSession');
    toast.success('Logout realizado');
    setLocation('/afiliados');
  };

  const handleCopyCode = () => {
    if (session?.affiliateCode) {
      navigator.clipboard.writeText(session.affiliateCode);
      toast.success('Código de afiliado copiado!');
    }
  };

  const handleCopyLink = () => {
    if (session?.affiliateCode) {
      const link = `${window.location.origin}?ref=${session.affiliateCode}`;
      navigator.clipboard.writeText(link);
      toast.success('Link de referência copiado!');
    }
  };

  const handleSubmitPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.info('Funcionalidade de submissão de apólices em desenvolvimento');
    setShowPolicyForm(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pt-16">
        <p className="text-gold">Carregando...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const stats = dashboardQuery.data?.stats || {
    totalReferrals: 0,
    convertedReferrals: 0,
    pendingReferrals: 0,
    totalCommission: 0,
    totalPolicies: 0,
    totalPoints: 0,
  };

  const referrals = dashboardQuery.data?.referrals || [];
  const policies = dashboardQuery.data?.policies || [];

  return (
    <div className="min-h-screen bg-black pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gold mb-2">Dashboard de Afiliados</h1>
            <p className="text-gray-400">Bem-vindo, {session.name}!</p>
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

        {/* Affiliate Code Section */}
        <Card className="bg-black border-gold/20 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gold mb-4">Seu Código de Afiliado</h2>
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="flex-1">
              <p className="text-gray-400 text-sm mb-2">Código</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={session.affiliateCode}
                  readOnly
                  className="flex-1 bg-black border border-gold/30 text-white px-4 py-2 rounded"
                />
                <Button
                  onClick={handleCopyCode}
                  className="bg-gold text-black hover:bg-gold/90"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-gray-400 text-sm mb-2">Link de Referência</p>
              <Button
                onClick={handleCopyLink}
                className="w-full bg-gold text-black hover:bg-gold/90"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Link
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid md:grid-cols-6 gap-4 mb-8">
          <Card className="bg-black border-gold/20 p-6">
            <p className="text-gray-400 text-sm mb-2">Referências</p>
            <p className="text-3xl font-bold text-gold">{stats.totalReferrals}</p>
          </Card>
          <Card className="bg-black border-gold/20 p-6">
            <p className="text-gray-400 text-sm mb-2">Conversões</p>
            <p className="text-3xl font-bold text-gold">{stats.convertedReferrals}</p>
          </Card>
          <Card className="bg-black border-gold/20 p-6">
            <p className="text-gray-400 text-sm mb-2">Pendentes</p>
            <p className="text-3xl font-bold text-gold">{stats.pendingReferrals}</p>
          </Card>
          <Card className="bg-black border-gold/20 p-6">
            <p className="text-gray-400 text-sm mb-2">Comissão</p>
            <p className="text-3xl font-bold text-gold">${stats.totalCommission.toFixed(2)}</p>
          </Card>
          <Card className="bg-black border-gold/20 p-6">
            <p className="text-gray-400 text-sm mb-2">Apólices</p>
            <p className="text-3xl font-bold text-gold">{stats.totalPolicies}</p>
          </Card>
          <Card className="bg-black border-gold/20 p-6 border-2 border-gold">
            <p className="text-gray-400 text-sm mb-2">Pontos (12 meses)</p>
            <p className="text-3xl font-bold text-gold">{stats.totalPoints}</p>
          </Card>
        </div>

        {/* Policies Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gold">Apólices Submetidas</h2>
            <Button
              onClick={() => setShowPolicyForm(!showPolicyForm)}
              className="bg-gold text-black hover:bg-gold/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Apólice
            </Button>
          </div>

          {showPolicyForm && (
            <Card className="bg-black border-gold/20 p-6 mb-6">
              <h3 className="text-xl font-semibold text-gold mb-4">Submeter Nova Apólice</h3>
              <form onSubmit={handleSubmitPolicy} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="text"
                    placeholder="Número da Apólice"
                    value={policyForm.policyNumber}
                    onChange={(e) => setPolicyForm({ ...policyForm, policyNumber: e.target.value })}
                    className="bg-black border-gold/30 text-white"
                    required
                  />
                  <Input
                    type="text"
                    placeholder="Nome do Cliente"
                    value={policyForm.clientName}
                    onChange={(e) => setPolicyForm({ ...policyForm, clientName: e.target.value })}
                    className="bg-black border-gold/30 text-white"
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Email do Cliente"
                    value={policyForm.clientEmail}
                    onChange={(e) => setPolicyForm({ ...policyForm, clientEmail: e.target.value })}
                    className="bg-black border-gold/30 text-white"
                  />
                  <Input
                    type="tel"
                    placeholder="Telefone do Cliente"
                    value={policyForm.clientPhone}
                    onChange={(e) => setPolicyForm({ ...policyForm, clientPhone: e.target.value })}
                    className="bg-black border-gold/30 text-white"
                  />
                  <select
                    value={policyForm.policyType}
                    onChange={(e) => setPolicyForm({ ...policyForm, policyType: e.target.value })}
                    className="bg-black border border-gold/30 text-white px-4 py-2 rounded"
                  >
                    <option>Seguro de Vida</option>
                    <option>Previdência Privada</option>
                    <option>Benefícios em Vida</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-gold text-black hover:bg-gold/90">
                    Submeter
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowPolicyForm(false)}
                    variant="outline"
                    className="border-gold/30 text-gold"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card className="bg-black border-gold/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gold/20">
                    <th className="px-4 py-3 text-left text-gold font-semibold">Nº Apólice</th>
                    <th className="px-4 py-3 text-left text-gold font-semibold">Cliente</th>
                    <th className="px-4 py-3 text-left text-gold font-semibold">Data</th>
                    <th className="px-4 py-3 text-left text-gold font-semibold">Tipo</th>
                    <th className="px-4 py-3 text-left text-gold font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-gold font-semibold">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        Nenhuma apólice submetida ainda
                      </td>
                    </tr>
                  ) : (
                    policies.map((policy) => (
                      <tr key={policy.id} className="border-b border-gold/10 hover:bg-gold/5">
                        <td className="px-4 py-3 text-white font-mono text-sm">{policy.policyNumber}</td>
                        <td className="px-4 py-3 text-white">{policy.clientName}</td>
                        <td className="px-4 py-3 text-white text-sm">
                          {new Date(policy.submittedAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">{policy.policyType}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            policy.status === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
                            policy.status === 'approved' ? 'bg-green-600/20 text-green-400' :
                            policy.status === 'active' ? 'bg-blue-600/20 text-blue-400' :
                            'bg-red-600/20 text-red-400'
                          }`}>
                            {policy.status === 'pending' ? 'Pendente' :
                             policy.status === 'approved' ? 'Aprovada' :
                             policy.status === 'active' ? 'Ativa' : 'Rejeitada'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gold font-semibold">{policy.points}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Referrals Table */}
        <div>
          <h2 className="text-2xl font-bold text-gold mb-4">Referências</h2>
          <Card className="bg-black border-gold/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gold/20">
                    <th className="px-4 py-3 text-left text-gold font-semibold">Email</th>
                    <th className="px-4 py-3 text-left text-gold font-semibold">Nome</th>
                    <th className="px-4 py-3 text-left text-gold font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-gold font-semibold">Comissão</th>
                    <th className="px-4 py-3 text-left text-gold font-semibold">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        Nenhuma referência ainda
                      </td>
                    </tr>
                  ) : (
                    referrals.map((referral) => (
                      <tr key={referral.id} className="border-b border-gold/10 hover:bg-gold/5">
                        <td className="px-4 py-3 text-white text-sm">{referral.visitorEmail}</td>
                        <td className="px-4 py-3 text-white">{referral.visitorName}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            referral.status === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
                            referral.status === 'converted' ? 'bg-green-600/20 text-green-400' :
                            'bg-gray-600/20 text-gray-400'
                          }`}>
                            {referral.status === 'pending' ? 'Pendente' :
                             referral.status === 'converted' ? 'Convertida' : 'Fechada'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gold font-semibold">${referral.commissionAmount}</td>
                        <td className="px-4 py-3 text-white text-sm">
                          {new Date(referral.createdAt).toLocaleDateString('pt-BR')}
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
    </div>
  );
}
