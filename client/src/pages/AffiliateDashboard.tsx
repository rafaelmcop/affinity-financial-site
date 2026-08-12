import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Copy, LogOut, Plus } from 'lucide-react';
import Header from '@/components/Header';

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
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '', relationship: '', details: '' });
  const logoutMutation = trpc.auth.logout.useMutation();
  const submitLeadMutation = trpc.affiliate.submitLead.useMutation();

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

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
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
  };

  const referrals = dashboardQuery.data?.referrals || [];

  return (
    <div className="min-h-screen bg-black">
      <Header title="Dashboard de Afiliados" userType="affiliate" showBackButton={false} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bem-vindo */}
        <div className="mb-8">
          <p className="text-gray-400">Bem-vindo, <span className="text-gold font-semibold">{session.name}</span>!</p>
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
        <div className="grid gap-4 mb-8 md:grid-cols-4">
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
        </div>

        {/* Referrals Table */}
        <div>
          <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-2xl font-bold text-gold">Leads indicados</h2><p className="mt-1 text-sm text-gray-400">Você receberá o valor definido pela Affinity quando o lead fechar um produto.</p></div><Button onClick={() => setShowLeadForm(!showLeadForm)} className="bg-gold text-black"><Plus className="mr-2 h-4 w-4" />Indicar lead</Button></div>
          {showLeadForm && <Card className="mb-5 border-gold/20 bg-black p-6"><form className="grid gap-4 md:grid-cols-2" onSubmit={async event => { event.preventDefault(); if (!session) return; try { await submitLeadMutation.mutateAsync({ affiliateId: session.id, name: leadForm.name, email: leadForm.email, phone: leadForm.phone, relationship: leadForm.relationship, details: leadForm.details }); setLeadForm({ name: '', email: '', phone: '', relationship: '', details: '' }); setShowLeadForm(false); await dashboardQuery.refetch(); toast.success('Lead enviado com sucesso'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível enviar o lead'); } }}><Input placeholder="Nome do contato" value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} required /><Input type="email" placeholder="E-mail" value={leadForm.email} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} required /><Input type="tel" placeholder="Telefone" value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} required /><Input placeholder="Como você conhece este contato?" value={leadForm.relationship} onChange={e => setLeadForm({ ...leadForm, relationship: e.target.value })} required /><textarea placeholder="Detalhes" value={leadForm.details} onChange={e => setLeadForm({ ...leadForm, details: e.target.value })} className="min-h-24 rounded-md border border-gold/30 bg-black p-3 text-white md:col-span-2" /><Button type="submit" className="bg-gold text-black md:col-span-2">Enviar indicação</Button></form></Card>}
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
