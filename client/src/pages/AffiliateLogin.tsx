import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function AffiliateLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const loginMutation = trpc.affiliate.login.useMutation();
  const resetPasswordMutation = trpc.passwordReset.requestReset.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await loginMutation.mutateAsync({
        email,
        password,
      });

      // Store affiliate session in localStorage
      localStorage.setItem('affiliateSession', JSON.stringify(result));
      toast.success('Login realizado com sucesso!');
      setLocation('/afiliados/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="bg-black border-b border-gold/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="text-gold font-bold text-xl">Affinity Financial</div>
              <span className="text-sm text-gold/80 font-semibold hidden sm:inline">
                Painel de Afiliados
              </span>
            </div>
            <Button
              onClick={() => setLocation('/')}
              variant="outline"
              className="border-gold/30 text-gold hover:bg-gold/10"
            >
              Voltar ao Site
            </Button>
          </div>
        </div>
      </header>

      {/* Login Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md bg-black border-gold/20">
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gold mb-2">Bem-vindo</h1>
            <p className="text-gray-400 text-sm mb-8">Faça login para acessar o painel</p>

            <form method="post" onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Email
                </label>
                <Input
                  id="affiliate-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  aria-label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-black border-gold/30 text-white placeholder-gray-500"
                  required
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Senha
                </label>
                <Input
                  id="affiliate-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  aria-label="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-black border-gold/30 text-white placeholder-gray-500"
                  required
                />
                <button type="button" className="text-gold text-xs mt-2 hover:text-gold/80 cursor-pointer" onClick={() => setShowForgotPassword(true)}>
                  Esqueceu a senha?`n                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gold text-black hover:bg-gold/90 font-semibold"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="space-y-4 mt-6">
              <p className="text-gray-400 text-sm text-center">
                Não tem uma conta?
                <a href="/afiliados/registrar" className="text-gold hover:text-gold/80 ml-1">
                  Criar conta
                </a>
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <Card className="bg-black border-gold/20 p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gold mb-4">Recuperar Senha</h2>
            <p className="text-gray-400 mb-6 text-sm">
              Digite seu email para receber instruções de recuperação de senha.
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!forgotEmail) {
                toast.error('Por favor, digite seu email');
                return;
              }
              try {
                // Chamar endpoint de password reset
                await resetPasswordMutation.mutateAsync({
                  email: forgotEmail,
                  userType: 'affiliate',
                });
                toast.success('Instruções de recuperação foram enviadas para seu email');
                setShowForgotPassword(false);
                setForgotEmail('');
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Erro ao enviar email de recuperação');
              }
            }} method="post" className="space-y-4">
              <div>
                <label className="block text-gold text-sm font-semibold mb-2">Email</label>
                <Input
                  id="affiliate-reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  aria-label="Email"
                  placeholder="seu@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="bg-black border-gold/30 text-white"
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-gold text-black hover:bg-gold/90 font-semibold"
                >
                  Enviar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-gold/30 text-gold hover:bg-gold/10"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotEmail('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
