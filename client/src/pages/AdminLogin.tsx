import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const loginMutation = trpc.admin.login.useMutation();
  const resetPasswordMutation = trpc.passwordReset.requestReset.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await loginMutation.mutateAsync({ email, password });
      localStorage.setItem('adminSession', JSON.stringify(result));
      toast.success('Login realizado com sucesso!');
      setLocation('/admin/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 pt-16">
      <Card className="bg-black border-gold/20 p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gold mb-2">Affinity Financial</h1>
        <p className="text-gray-400 mb-6">Painel de Administração</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gold text-sm font-semibold mb-2">Email</label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black border-gold/30 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-gold text-sm font-semibold mb-2">Senha</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleLogin(e as any);
                }
              }}
              className="bg-black border-gold/30 text-white"
              required
            />
            <p 
              className="text-gold text-xs mt-2 hover:text-gold/80 cursor-pointer"
              onClick={() => setShowForgotPassword(true)}
            >
              Esqueceu a senha?
            </p>
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
            Acesso restrito a administradores
          </p>
          <p className="text-gray-400 text-sm text-center border-t border-gold/20 pt-4">
            <a href="/" className="text-gold hover:text-gold/80">
              Voltar ao site
            </a>
          </p>
        </div>
      </Card>

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
                  userType: 'admin',
                });
                toast.success('Instruções de recuperação foram enviadas para seu email');
                setShowForgotPassword(false);
                setForgotEmail('');
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Erro ao enviar email de recuperação');
              }
            }} className="space-y-4">
              <div>
                <label className="block text-gold text-sm font-semibold mb-2">Email</label>
                <Input
                  type="email"
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
