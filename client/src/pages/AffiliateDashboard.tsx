import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Copy, LogOut } from 'lucide-react';

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
    <div className="min-h-screen bg-black pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
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
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-black border-gold/20 p-6">
            <p className="text-gray-400 text-sm mb-2">Total de Referências</p>
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
            <p className="text-gray-400 text-sm mb-2">Comissão Total</p>
            <p className="text-3xl font-bold text-gold">
              ${stats.totalCommission.toFixed(2)}
            </p>
          </Card>
        </div>

        {/* Referrals Table */}
        <Card className="bg-black border-gold/20 p-6">
          <h2 className="text-xl font-semibold text-gold mb-4">Suas Referências</h2>
          {referrals.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              Nenhuma referência ainda. Comece a compartilhar seu link!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gold/20">
                    <th className="text-left py-3 px-4 text-gold text-sm font-semibold">
                      Nome
                    </th>
                    <th className="text-left py-3 px-4 text-gold text-sm font-semibold">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-gold text-sm font-semibold">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-gold text-sm font-semibold">
                      Comissão
                    </th>
                    <th className="text-left py-3 px-4 text-gold text-sm font-semibold">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral) => (
                    <tr key={referral.id} className="border-b border-gold/10 hover:bg-gold/5">
                      <td className="py-3 px-4 text-white">
                        {referral.visitorName || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {referral.visitorEmail || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded text-xs font-semibold ${
                            referral.status === 'converted'
                              ? 'bg-green-900/30 text-green-400'
                              : referral.status === 'pending'
                              ? 'bg-yellow-900/30 text-yellow-400'
                              : 'bg-red-900/30 text-red-400'
                          }`}
                        >
                          {referral.status === 'converted'
                            ? 'Convertido'
                            : referral.status === 'pending'
                            ? 'Pendente'
                            : 'Fechado'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gold font-semibold">
                        ${parseFloat(referral.commissionAmount?.toString() || '0').toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {new Date(referral.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
