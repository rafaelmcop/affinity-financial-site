import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Eye, EyeOff } from 'lucide-react';
import Header from '@/components/Header';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function AdminTestimonials() {
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    quote: '',
    mediaUrl: '',
    mediaType: 'image' as 'image' | 'video',
    language: 'pt' as 'pt' | 'en' | 'es',
  });

  const testimonialsQuery = trpc.testimonials.getAll.useQuery();
  const createMutation = trpc.testimonials.create.useMutation();
  const updateMutation = trpc.testimonials.update.useMutation();
  const deleteMutation = trpc.testimonials.delete.useMutation();
  const toggleActiveMutation = trpc.testimonials.toggleActive.useMutation();

  const handleAddTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        name: formData.name,
        role: formData.role,
        quote: formData.quote,
        mediaUrl: formData.mediaUrl || undefined,
        mediaType: formData.mediaType,
        language: formData.language,
      });
      toast.success('Depoimento adicionado com sucesso!');
      setFormData({
        name: '',
        role: '',
        quote: '',
        mediaUrl: '',
        mediaType: 'image',
        language: 'pt',
      });
      setShowForm(false);
      await testimonialsQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar depoimento');
    }
  };

  const handleDeleteTestimonial = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este depoimento?')) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success('Depoimento deletado!');
      await testimonialsQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar depoimento');
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await toggleActiveMutation.mutateAsync({ id, isActive: !isActive });
      toast.success('Status atualizado!');
      await testimonialsQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar status');
    }
  };

  const testimonials = testimonialsQuery.data || [];

  return (
    <div className="min-h-screen bg-black">
      <Header title="Gerenciar Depoimentos" userType="admin" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div></div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-gold text-black hover:bg-gold/90 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Depoimento
          </Button>
        </div>

        {showForm && (
          <Card className="bg-black border-gold/20 p-6 mb-6">
            <h3 className="text-xl font-semibold text-gold mb-4">Adicionar Depoimento</h3>
            <form onSubmit={handleAddTestimonial} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="text"
                  placeholder="Nome"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-black border-gold/30 text-white"
                  required
                />
                <Input
                  type="text"
                  placeholder="Cargo/Profissão"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="bg-black border-gold/30 text-white"
                  required
                />
              </div>

              <textarea
                placeholder="Depoimento"
                value={formData.quote}
                onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                className="w-full bg-black border border-gold/30 text-white px-4 py-2 rounded"
                rows={4}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  type="text"
                  placeholder="URL da Mídia (ex: /manus-storage/video.mp4)"
                  value={formData.mediaUrl}
                  onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                  className="bg-black border-gold/30 text-white"
                />
                <select
                  value={formData.mediaType}
                  onChange={(e) => setFormData({ ...formData, mediaType: e.target.value as 'image' | 'video' })}
                  className="bg-black border border-gold/30 text-white px-4 py-2 rounded"
                >
                  <option value="image">Imagem</option>
                  <option value="video">Vídeo</option>
                </select>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value as 'pt' | 'en' | 'es' })}
                  className="bg-black border border-gold/30 text-white px-4 py-2 rounded"
                >
                  <option value="pt">Português</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-gold text-black hover:bg-gold/90">
                  Adicionar
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowForm(false)}
                  variant="outline"
                  className="border-gold/30 text-gold"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card className="bg-black border-gold/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/20">
                  <th className="px-4 py-3 text-left text-gold font-semibold">Nome</th>
                  <th className="px-4 py-3 text-left text-gold font-semibold">Cargo</th>
                  <th className="px-4 py-3 text-left text-gold font-semibold">Idioma</th>
                  <th className="px-4 py-3 text-left text-gold font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-left text-gold font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-gold font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {testimonials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Nenhum depoimento encontrado
                    </td>
                  </tr>
                ) : (
                  testimonials.map((testimonial: any) => (
                    <tr key={testimonial.id} className="border-b border-gold/10 hover:bg-gold/5">
                      <td className="px-4 py-3 text-white">{testimonial.name}</td>
                      <td className="px-4 py-3 text-white text-sm">{testimonial.role}</td>
                      <td className="px-4 py-3 text-white text-sm">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-gold/20 text-gold">
                          {testimonial.language.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          testimonial.mediaType === 'video' 
                            ? 'bg-blue-600/20 text-blue-400' 
                            : 'bg-purple-600/20 text-purple-400'
                        }`}>
                          {testimonial.mediaType === 'video' ? '🎥 Vídeo' : '🖼️ Imagem'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          testimonial.isActive === 1
                            ? 'bg-green-600/20 text-green-400'
                            : 'bg-gray-600/20 text-gray-400'
                        }`}>
                          {testimonial.isActive === 1 ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleActive(testimonial.id, testimonial.isActive === 1)}
                            className={`transition ${
                              testimonial.isActive === 1
                                ? 'text-yellow-400 hover:text-yellow-300'
                                : 'text-gray-400 hover:text-gray-300'
                            }`}
                            title={testimonial.isActive === 1 ? 'Desativar' : 'Ativar'}
                          >
                            {testimonial.isActive === 1 ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteTestimonial(testimonial.id)}
                            className="text-red-400 hover:text-red-300 transition"
                            title="Deletar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
