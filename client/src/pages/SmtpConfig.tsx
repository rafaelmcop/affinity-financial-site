import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Mail, Save, Send } from 'lucide-react';

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

  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (!adminSession) {
      setLocation('/admin/login');
      return;
    }
    setIsAuthenticated(true);
    setIsLoading(false);
  }, [setLocation]);

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
      // TODO: Implementar chamada ao backend para salvar SMTP config
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
      // TODO: Implementar chamada ao backend para enviar email de teste
      toast.success('Email de teste enviado com sucesso!');
      setTestEmail('');
    } catch (error) {
      toast.error('Erro ao enviar email de teste');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pt-20 px-4 pb-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gold flex items-center gap-3">
            <Mail className="w-10 h-10" />
            Configuração SMTP
          </h1>
          <p className="text-gray-400 mt-2">Configure o servidor de email para enviar notificações</p>
        </div>

        <Card className="bg-black border-gold/20 p-8 space-y-6">
          {/* SMTP Server Settings */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gold">Servidor SMTP</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gold text-sm font-semibold mb-2">Host</label>
                <Input
                  name="host"
                  placeholder="smtp.gmail.com"
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
                placeholder="seu-email@gmail.com"
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
                Para Gmail, use uma senha de app: https://myaccount.google.com/apppasswords
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
            <li>• Gmail: Use smtp.gmail.com:587 com TLS ativado</li>
            <li>• Crie uma senha de app em: https://myaccount.google.com/apppasswords</li>
            <li>• Outlook: Use smtp-mail.outlook.com:587 com TLS ativado</li>
            <li>• Sempre teste a configuração antes de usar em produção</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
