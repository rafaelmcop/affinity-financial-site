import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import Header from '@/components/Header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdminUserManagement() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      setLocation('/painel/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.userType !== 'admin' || !user.isAdmin) {
        setLocation('/painel/login');
        return;
      }
      setIsAuthenticated(true);
    } catch (error) {
      setLocation('/painel/login');
    }
  }, [setLocation]);

  if (!isAuthenticated) {
    return null;
  }

  const createUserMutation = trpc.admin.createUser.useMutation({
    onSuccess: () => {
      setSuccess('Usuário criado com sucesso!');
      setEmail('');
      setPassword('');
      setName('');
      setIsAdmin(false);
      setError('');
      setTimeout(() => setSuccess(''), 3000);
      setIsLoading(false);
    },
    onError: (err) => {
      setError(err.message || 'Erro ao criar usuário');
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!email || !password || !name) {
      setError('Por favor, preencha todos os campos');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      setIsLoading(false);
      return;
    }

    createUserMutation.mutate({
      email,
      password,
      name,
      isAdmin: isAdmin ? 1 : 0,
    });
  };

  return (
    <div className="min-h-screen bg-black">
      <Header userType="admin" title="Gerenciar Usuários" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Create User Form */}
          <Card className="bg-black border-gold/20">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gold mb-6 flex items-center gap-2">
                <Plus size={24} />
                Adicionar Novo Usuário
              </h2>

              {error && (
                <div className="mb-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-3">
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 bg-green-900/20 border border-green-500/50 rounded-lg">
                  <p className="text-green-400 text-sm">{success}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-gold">
                    Nome Completo
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="João Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    className="bg-gray-900 border-gold/30 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-gold">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="bg-gray-900 border-gold/30 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-gold">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-gray-900 border-gold/30 text-white"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Checkbox
                    id="isAdmin"
                    checked={isAdmin}
                    onCheckedChange={(checked) => setIsAdmin(checked === true)}
                    disabled={isLoading}
                    className="border-gold/30"
                  />
                  <Label htmlFor="isAdmin" className="text-gold cursor-pointer">
                    Conceder poderes administrativos
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gold hover:bg-gold/90 text-black font-bold py-2 mt-6"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Usuário
                    </>
                  )}
                </Button>
              </form>
            </div>
          </Card>

          {/* User List */}
          <Card className="bg-black border-gold/20">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gold mb-6">Usuários Cadastrados</h2>
              <div className="text-gray-400 text-sm">
                <p>Funcionalidade em desenvolvimento...</p>
                <p className="mt-2">Aqui será exibida a lista de usuários com opções para editar e deletar.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
