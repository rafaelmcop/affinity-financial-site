import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Copy, LogOut, Plus } from 'lucide-react';
import Header from '@/components/Header';

interface UnifiedUser {
  id: number;
  email: string;
  name: string;
  userType: 'admin' | 'affiliate';
  isAdmin: number;
}

export default function AffiliateDashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    policyNumber: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    policyType: 'Seguro de Vida',
  });

  useEffect(() => {
    // Check if user is logged in
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      console.log('[AFFILIATE DASHBOARD] No user found, redirecting to login');
      setLocation('/painel/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr) as UnifiedUser;
      console.log('[AFFILIATE DASHBOARD] User:', userData);
      
      // Allow both admin and affiliate users
      if (userData.userType !== 'admin' && userData.userType !== 'affiliate') {
        console.log('[AFFILIATE DASHBOARD] Invalid user type');
        setLocation('/painel/login');
        return;
      }
      
      setUser(userData);
    } catch (error) {
      console.error('[AFFILIATE DASHBOARD] Failed to parse user:', error);
      localStorage.removeItem('user');
      setLocation('/painel/login');
    } finally {
      setIsLoading(false);
    }
  }, [setLocation]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setLocation('/painel/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <Header userType="affiliate" showLogo={true} />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <p className="text-gold">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      <Header userType="affiliate" showLogo={true} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <Card className="mb-8 bg-gradient-to-r from-gold/10 to-transparent border-gold/20">
          <div className="p-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-gold mb-2">Bem-vindo, {user.name}</h1>
                <p className="text-gray-400">Email: {user.email}</p>
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
          </div>
        </Card>

        {/* Main Content */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-gold/20">
            <div className="p-6">
              <h3 className="text-gold font-semibold mb-2">Minhas Apólices</h3>
              <p className="text-3xl font-bold text-white">0</p>
            </div>
          </Card>

          <Card className="bg-gray-900/50 border-gold/20">
            <div className="p-6">
              <h3 className="text-gold font-semibold mb-2">Comissões</h3>
              <p className="text-3xl font-bold text-white">R$ 0,00</p>
            </div>
          </Card>

          <Card className="bg-gray-900/50 border-gold/20">
            <div className="p-6">
              <h3 className="text-gold font-semibold mb-2">Status</h3>
              <p className="text-xl font-bold text-green-400">Ativo</p>
            </div>
          </Card>
        </div>

        {/* Policy Form */}
        {showPolicyForm && (
          <Card className="mb-8 bg-gray-900/50 border-gold/20">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gold mb-6">Submeter Nova Apólice</h2>
              <div className="space-y-4">
                <Input
                  placeholder="Número da Apólice"
                  value={policyForm.policyNumber}
                  onChange={(e) => setPolicyForm({ ...policyForm, policyNumber: e.target.value })}
                  className="bg-gray-800 border-gold/30 text-white"
                />
                <Input
                  placeholder="Nome do Cliente"
                  value={policyForm.clientName}
                  onChange={(e) => setPolicyForm({ ...policyForm, clientName: e.target.value })}
                  className="bg-gray-800 border-gold/30 text-white"
                />
                <Input
                  placeholder="Email do Cliente"
                  type="email"
                  value={policyForm.clientEmail}
                  onChange={(e) => setPolicyForm({ ...policyForm, clientEmail: e.target.value })}
                  className="bg-gray-800 border-gold/30 text-white"
                />
                <Input
                  placeholder="Telefone do Cliente"
                  value={policyForm.clientPhone}
                  onChange={(e) => setPolicyForm({ ...policyForm, clientPhone: e.target.value })}
                  className="bg-gray-800 border-gold/30 text-white"
                />
                <div className="flex gap-4">
                  <Button className="bg-gold hover:bg-gold/90 text-black font-bold flex-1">
                    Submeter
                  </Button>
                  <Button
                    onClick={() => setShowPolicyForm(false)}
                    variant="outline"
                    className="border-gold/30 text-gold hover:bg-gold/10 flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {!showPolicyForm && (
          <Button
            onClick={() => setShowPolicyForm(true)}
            className="bg-gold hover:bg-gold/90 text-black font-bold mb-8"
          >
            <Plus className="w-4 h-4 mr-2" />
            Submeter Apólice
          </Button>
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setLocation('/')}
            className="text-gold hover:text-gold/80 text-sm font-semibold py-2"
          >
            ← Voltar ao Site Principal
          </button>
        </div>
      </div>
    </div>
  );
}
