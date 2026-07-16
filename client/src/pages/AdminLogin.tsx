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

  const loginMutation = trpc.admin.login.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await loginMutation.mutateAsync({ email, password });
      localStorage.setItem('adminSession', JSON.stringify(result));
      toast.success('Login realizado com sucesso!');
      setLocation('/admin/afiliados');
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
              className="bg-black border-gold/30 text-white"
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

        <p className="text-gray-400 text-sm text-center mt-6">
          Acesso restrito a administradores
        </p>
      </Card>
    </div>
  );
}
