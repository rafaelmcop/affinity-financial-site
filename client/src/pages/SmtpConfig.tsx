import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Mail, Save, Send } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import AdminSidebar from '@/components/AdminSidebar';

export default function SmtpConfig() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [formData, setFormData] = useState({
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    fromEmail: 'info@affinityfc.org',
    fromName: 'Affinity Financial',
  });

  const [testEmail, setTestEmail] = useState('');
  const configQuery = trpc.admin.getEmailConfig.useQuery();
  const saveMutation = trpc.admin.saveEmailConfig.useMutation();
  const testMutation = trpc.admin.testEmailConfig.useMutation();

  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (!adminSession) {
      setLocation('/admin/login');
      return;
    }
    setIsAuthenticated(true);
    setIsLoading(false);
  }, [setLocation]);

  useEffect(() => {
    if (configQuery.data) setFormData(prev => ({ ...prev, ...configQuery.data, password: '' }));
  }, [configQuery.data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pt-16">
        <p className="text-gold">Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync(formData);
      toast.success('Configuração SMTP salva com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configuração SMTP');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Digite um email para teste');
      return;
    }

    setIsTesting(true);
    try {
      await testMutation.mutateAsync({ email: testEmail });
      toast.success('Email de teste enviado com sucesso!');
      setTestEmail('');
    } catch (error) {
      toast.error('Erro ao enviar email de teste');
    } finally {
      setIsTesting(false);
    }
  };

  const useICloud = () => {
    setFormData(prev => ({ ...prev, host: 'smtp.mail.me.com', port: 587, secure: false, fromEmail: prev.user || prev.fromEmail }));
    toast.success('Configuração do iCloud preenchida. Informe seu e-mail e a senha específica de app.');
  };

  return (
    <div className="min-h-screen bg-black lg:pl-64 px-4 pb-10">
      <AdminSidebar />
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 pt-10">
          <h1 className="text-4xl font-bold text-gold flex items-center gap-3">
            <Mail className="w-10 h-10" />
            Configuração SMTP
          </h1>
          <p className="text-gray-400 mt-2">Configure o servidor de email para enviar notificações</p>
        </div>

        <Card className="bg-black border-gold/20 p-8 space-y-6">
          <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div><p className="text-white font-semibold">Usar uma conta iCloud</p><p className="text-gray-400 text-sm">Compatível com @icloud.com, @me.com e @mac.com.</p></div>
              <Button type="button" onClick={useICloud} className="bg-blue-600 hover:bg-blue-700 text-white">Usar iCloud</Button>
            </div>
          </div>
          {/* SMTP Server Settings */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gold">Servidor SMTP</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gold text-sm font-semibold mb-2">Host</label>
                <Input
                  name="host"
                placeholder="smtp.mail.me.com"
                  value={formData.host}
                  onChange={handleInputChange}
                  className="bg-black border-gold/30 text-white"
                />
              </div>
              <div>
                <label className="block text-gold text-sm font-semibold mb-2">Porta</label>
                <Input
                  name="port"
                  type="number"
                  value={formData.port}
                  onChange={handleInputChange}
                  className="bg-black border-gold/30 text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gold/10 rounded-lg border border-gold/20">
              <Switch
                checked={formData.secure}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, secure: checked }))
                }
              />
              <label className="text-gold text-sm font-semibold cursor-pointer">
                Usar TLS/SSL (Seguro)
              </label>
            </div>
          </div>

          {/* Authentication */}
          <div className="space-y-4 border-t border-gold/20 pt-6">
            <h2 className="text-xl font-semibold text-gold">Autenticação</h2>
            
            <div>
              <label className="block text-gold text-sm font-semibold mb-2">Email/Usuário</label>
              <Input
                name="user"
                type="email"
                placeholder="seu-email@icloud.com"
                value={formData.user}
                onChange={handleInputChange}
                className="bg-black border-gold/30 text-white"
              />
            </div>

            <div>
              <label className="block text-gold text-sm font-semibold mb-2">Senha/Token</label>
              <Input
                name="password"
                type="password"
                placeholder="sua-senha-ou-app-password"
                value={formData.password}
                onChange={handleInputChange}
                className="bg-black border-gold/30 text-white"
              />
              <p className="text-gray-400 text-xs mt-2">
                No iCloud, use uma senha específica de app criada em account.apple.com. Não use sua senha normal da Apple.
              </p>
            </div>
          </div>

          {/* Sender Info */}
          <div className="space-y-4 border-t border-gold/20 pt-6">
            <h2 className="text-xl font-semibold text-gold">Informações do Remetente</h2>
            
            <div>
              <label className="block text-gold text-sm font-semibold mb-2">Email do Remetente</label>
              <Input
                name="fromEmail"
                type="email"
                value={formData.fromEmail}
                onChange={handleInputChange}
                className="bg-black border-gold/30 text-white"
              />
            </div>

            <div>
              <label className="block text-gold text-sm font-semibold mb-2">Nome do Remetente</label>
              <Input
                name="fromName"
                placeholder="Affinity Financial"
                value={formData.fromName}
                onChange={handleInputChange}
                className="bg-black border-gold/30 text-white"
              />
            </div>
          </div>

          {/* Test Email */}
          <div className="space-y-4 border-t border-gold/20 pt-6">
            <h2 className="text-xl font-semibold text-gold">Testar Configuração</h2>
            <p className="text-gray-400 text-sm">
              Envie um email de teste para verificar se a configuração está funcionando
            </p>
            
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="seu-email@exemplo.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="bg-black border-gold/30 text-white flex-1"
              />
              <Button
                onClick={handleTestEmail}
                disabled={isTesting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <Send className="w-4 h-4 mr-2" />
                {isTesting ? 'Enviando...' : 'Enviar Teste'}
              </Button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-3 pt-6 border-t border-gold/20">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-gold text-black hover:bg-gold/90 font-semibold"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
            <Button
              onClick={() => setLocation('/admin/dashboard')}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold"
            >
              Voltar
            </Button>
          </div>
        </Card>

        <div className="mt-8 p-4 bg-gold/10 border border-gold/20 rounded-lg">
          <h3 className="text-gold font-semibold mb-2">Dicas de Configuração:</h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• iCloud: use smtp.mail.me.com, porta 587 e TLS ativado</li>
            <li>• Crie a senha específica de app em account.apple.com → Início de sessão e segurança</li>
            <li>• Outlook: Use smtp-mail.outlook.com:587 com TLS ativado</li>
            <li>• Sempre teste a configuração antes de usar em produção</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
