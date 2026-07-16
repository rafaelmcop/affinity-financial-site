import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function SubmitPolicy() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    policyNumber: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    policyType: 'life-insurance',
  });
  const [isLoading, setIsLoading] = useState(false);

  const submitMutation = trpc.affiliate.submitPolicy.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const affiliateData = localStorage.getItem('affiliateSession');
      if (!affiliateData) {
        toast.error('Sessão expirada. Faça login novamente.');
        setLocation('/afiliados');
        return;
      }

      const affiliate = JSON.parse(affiliateData);
      
      await submitMutation.mutateAsync({
        affiliateId: affiliate.id,
        policyNumber: formData.policyNumber,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail || undefined,
        clientPhone: formData.clientPhone || undefined,
        policyType: formData.policyType,
      });

      toast.success('Apólice submetida com sucesso!');
      setFormData({
        policyNumber: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        policyType: 'life-insurance',
      });
      
      setTimeout(() => setLocation('/afiliados/dashboard'), 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao submeter apólice');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pt-20 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setLocation('/afiliados/dashboard')}
          className="flex items-center gap-2 text-gold hover:text-gold/80 transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          Voltar ao Dashboard
        </button>

        <Card className="bg-black border-gold/20 p-8">
          <h1 className="text-3xl font-bold text-gold mb-2">Submeter Apólice</h1>
          <p className="text-gray-400 mb-6">Preencha os dados da apólice para submissão</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gold text-sm font-semibold mb-2">
                  Número da Apólice *
                </label>
                <Input
                  type="text"
                  placeholder="Ex: POL-2024-001"
                  value={formData.policyNumber}
                  onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                  className="bg-black border-gold/30 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-gold text-sm font-semibold mb-2">
                  Tipo de Apólice *
                </label>
                <select
                  value={formData.policyType}
                  onChange={(e) => setFormData({ ...formData, policyType: e.target.value })}
                  className="w-full bg-black border border-gold/30 text-white rounded-md px-3 py-2"
                  required
                >
                  <option value="life-insurance">Seguro de Vida</option>
                  <option value="pension">Previdência Privada</option>
                  <option value="living-benefits">Benefícios em Vida</option>
                  <option value="other">Outro</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gold text-sm font-semibold mb-2">
                Nome do Cliente *
              </label>
              <Input
                type="text"
                placeholder="Ex: João Silva"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="bg-black border-gold/30 text-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gold text-sm font-semibold mb-2">
                  Email do Cliente
                </label>
                <Input
                  type="email"
                  placeholder="cliente@email.com"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  className="bg-black border-gold/30 text-white"
                />
              </div>

              <div>
                <label className="block text-gold text-sm font-semibold mb-2">
                  Telefone do Cliente
                </label>
                <Input
                  type="tel"
                  placeholder="(857) 421-8325"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  className="bg-black border-gold/30 text-white"
                />
              </div>
            </div>

            <div className="bg-gold/10 border border-gold/20 rounded-lg p-4">
              <p className="text-gold text-sm">
                <strong>Nota:</strong> Sua apólice será revisada pelo painel de administração. Você receberá uma notificação quando for aprovada.
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gold text-black hover:bg-gold/90 font-semibold"
              >
                {isLoading ? 'Enviando...' : 'Submeter Apólice'}
              </Button>
              <Button
                type="button"
                onClick={() => setLocation('/afiliados/dashboard')}
                variant="outline"
                className="flex-1 border-gold/30 text-white hover:bg-gold/10"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
