import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { LayoutGrid, Users } from 'lucide-react';
import Header from '@/components/Header';

export default function PanelSelector() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Check if user is admin
    const userStr = localStorage.getItem('user');
    
    if (!userStr) {
      console.log('[PANEL SELECTOR] No user found, redirecting to login');
      setLocation('/painel/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      console.log('[PANEL SELECTOR] User data:', userData);
      
      if (userData.userType !== 'admin' || !userData.isAdmin) {
        console.log('[PANEL SELECTOR] User is not admin, redirecting to affiliate panel');
        setLocation('/painel/afiliado');
      }
    } catch (e) {
      console.error('[PANEL SELECTOR] Failed to parse user data:', e);
      setLocation('/painel/login');
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-black">
      <Header userType="admin" showLogo={false} />

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <Card className="w-full max-w-2xl bg-black border-gold/20">
          <div className="p-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gold mb-2">Selecione um Painel</h1>
              <p className="text-gray-400">Você tem acesso a ambos os painéis como administrador</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Admin Panel */}
              <button
                onClick={() => setLocation('/painel/admin')}
                className="group"
              >
                <Card className="h-full bg-gradient-to-br from-gold/10 to-transparent border-gold/30 hover:border-gold/60 transition-all cursor-pointer hover:shadow-lg hover:shadow-gold/20">
                  <div className="p-8 flex flex-col items-center justify-center h-full">
                    <div className="mb-4 p-4 bg-gold/20 rounded-lg group-hover:bg-gold/30 transition-colors">
                      <LayoutGrid className="w-12 h-12 text-gold" />
                    </div>
                    <h2 className="text-2xl font-bold text-gold mb-2">Painel Admin</h2>
                    <p className="text-gray-400 text-center text-sm">
                      Gerencie afiliados, apólices, comissões e depoimentos
                    </p>
                    <div className="mt-6">
                      <span className="inline-block px-4 py-2 bg-gold/20 text-gold rounded text-sm font-semibold">
                        Acessar →
                      </span>
                    </div>
                  </div>
                </Card>
              </button>

              {/* Affiliate Panel */}
              <button
                onClick={() => setLocation('/painel/afiliado')}
                className="group"
              >
                <Card className="h-full bg-gradient-to-br from-gold/10 to-transparent border-gold/30 hover:border-gold/60 transition-all cursor-pointer hover:shadow-lg hover:shadow-gold/20">
                  <div className="p-8 flex flex-col items-center justify-center h-full">
                    <div className="mb-4 p-4 bg-gold/20 rounded-lg group-hover:bg-gold/30 transition-colors">
                      <Users className="w-12 h-12 text-gold" />
                    </div>
                    <h2 className="text-2xl font-bold text-gold mb-2">Painel Afiliado</h2>
                    <p className="text-gray-400 text-center text-sm">
                      Visualize suas apólices, comissões e desempenho
                    </p>
                    <div className="mt-6">
                      <span className="inline-block px-4 py-2 bg-gold/20 text-gold rounded text-sm font-semibold">
                        Acessar →
                      </span>
                    </div>
                  </div>
                </Card>
              </button>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => setLocation('/')}
                className="text-gold hover:text-gold/80 text-sm font-semibold py-2"
              >
                ← Voltar ao Site Principal
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
