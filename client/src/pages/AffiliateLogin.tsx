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

  const loginMutation = trpc.affiliate.login.useMutation();

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
    <div className="min-h-screen bg-black flex items-center justify-center pt-16 px-4">
      <Card className="w-full max-w-md bg-black border-gold/20">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gold mb-2">Affinity Financial</h1>
          <p className="text-gray-400 text-sm mb-8">Área de Afiliados</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Email
              </label>
              <Input
                type="email"
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-black border-gold/30 text-white placeholder-gray-500"
                required
              />
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
            <p className="text-gray-400 text-sm text-center border-t border-gold/20 pt-4">
              Não é um afiliado?
              <a href="#contact" className="text-gold hover:text-gold/80 ml-1">
                Entre em contato conosco
              </a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
