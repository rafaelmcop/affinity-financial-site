import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function AffiliateRegister() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    company: '',
    phone: '',
  });

  const registerMutation = trpc.affiliate.register.useMutation();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não conferem');
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/.test(formData.password)) {
      toast.error('Use 6 ou mais caracteres, com maiúscula, minúscula, número e caractere especial');
      return;
    }

    try {
      await registerMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        company: formData.company || undefined,
        phone: formData.phone || undefined,
      });

      toast.success('Conta criada com sucesso! Aguarde aprovação do administrador.');
      setLocation('/afiliados');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar conta');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center pt-16 px-4">
      <Card className="w-full max-w-md bg-black border-gold/20">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gold mb-2">Affinity Financial</h1>
          <p className="text-gray-400 text-sm mb-8">Criar Conta de Afiliado</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Email *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="seu@email.com"
                className="bg-black border-gold/30 text-white placeholder-gray-500"
                required
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Nome Completo *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Seu Nome"
                className="bg-black border-gold/30 text-white placeholder-gray-500"
                required
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Empresa
              </label>
              <Input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Sua Empresa"
                className="bg-black border-gold/30 text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Telefone
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(857) 421-8325"
                className="bg-black border-gold/30 text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Senha *
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                minLength={6}
                pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{6,}"
                title="Mínimo 6 caracteres, incluindo maiúscula, minúscula, número e caractere especial"
                className="bg-black border-gold/30 text-white placeholder-gray-500"
                required
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Confirmar Senha *
              </label>
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                minLength={6}
                className="bg-black border-gold/30 text-white placeholder-gray-500"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full bg-gold text-black hover:bg-gold/90 font-semibold"
            >
              {registerMutation.isPending ? 'Criando...' : 'Criar Conta'}
            </Button>
          </form>

          <p className="text-gray-400 text-sm text-center mt-6">
            Já tem uma conta?{' '}
            <a href="/afiliados" className="text-gold hover:text-gold/80">
              Faça login
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
