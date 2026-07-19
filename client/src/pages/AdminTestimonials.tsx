import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Eye, EyeOff, Upload, Sliders } from 'lucide-react';
import Header from '@/components/Header';

export default function AdminTestimonials() {
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showFrameSelector, setShowFrameSelector] = useState(false);
  const [frameTime, setFrameTime] = useState(1);
  const [videoDuration, setVideoDuration] = useState(0);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    quote: '',
    mediaUrl: '',
    mediaType: 'image' as 'image' | 'video',
    language: 'pt' as 'pt' | 'en' | 'es',
    thumbnailUrl: '',
  });

  // All hooks must be called unconditionally
  const testimonialsQuery = trpc.testimonials.getAll.useQuery();
  const createMutation = trpc.testimonials.create.useMutation();
  const updateMutation = trpc.testimonials.update.useMutation();
  const deleteMutation = trpc.testimonials.delete.useMutation();
  const toggleActiveMutation = trpc.testimonials.toggleActive.useMutation();

  // useEffect must come after all useState and other hooks
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      // Upload to server endpoint
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setFormData({ ...formData, mediaUrl: data.url, mediaType: file.type.startsWith('video') ? 'video' : 'image' });
      toast.success('Arquivo enviado com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setIsUploading(false);
    }
  };

  const extractThumbnail = async () => {
    if (!videoPreviewRef.current || !canvasRef.current) return;

    const video = videoPreviewRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const thumbnailUrl = canvas.toDataURL('image/jpeg');
    setSelectedThumbnail(thumbnailUrl);
    setFormData({ ...formData, thumbnailUrl });
    setShowFrameSelector(false);
    toast.success('Capa extraída com sucesso!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.quote || !formData.mediaUrl) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...formData });
        toast.success('Depoimento atualizado!');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Depoimento criado!');
      }

      setFormData({
        name: '',
        role: '',
        quote: '',
        mediaUrl: '',
        mediaType: 'image',
        language: 'pt',
        thumbnailUrl: '',
      });
      setEditingId(null);
      setShowForm(false);
      testimonialsQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar depoimento');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success('Depoimento deletado!');
      testimonialsQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar depoimento');
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await toggleActiveMutation.mutateAsync({ id, isActive: !isActive });
      toast.success(isActive ? 'Depoimento desativado' : 'Depoimento ativado');
      testimonialsQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar depoimento');
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Header userType="admin" showLogo={true} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gold">Gerenciador de Depoimentos</h1>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-gold hover:bg-gold/90 text-black font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Depoimento
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-8 bg-gray-900/50 border-gold/20">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gold mb-6">
                {editingId ? 'Editar Depoimento' : 'Novo Depoimento'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Nome"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-gray-800 border-gold/30 text-white"
                />

                <Input
                  placeholder="Cargo/Profissão"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="bg-gray-800 border-gold/30 text-white"
                />

                <textarea
                  placeholder="Depoimento"
                  value={formData.quote}
                  onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                  className="w-full bg-gray-800 border border-gold/30 text-white rounded p-2"
                  rows={4}
                />

                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer">
                    <div className="bg-gray-800 border border-gold/30 rounded p-2 text-center text-gold hover:bg-gray-700">
                      <Upload className="w-4 h-4 inline mr-2" />
                      Enviar Arquivo
                    </div>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>

                  {formData.mediaType === 'video' && (
                    <Button
                      type="button"
                      onClick={() => setShowFrameSelector(!showFrameSelector)}
                      className="bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30"
                    >
                      <Sliders className="w-4 h-4 mr-2" />
                      Selecionar Capa
                    </Button>
                  )}
                </div>

                {showFrameSelector && formData.mediaType === 'video' && (
                  <div className="space-y-4 p-4 bg-gray-800/50 rounded">
                    <video
                      ref={videoPreviewRef}
                      src={formData.mediaUrl}
                      onLoadedMetadata={(e) => {
                        const video = e.currentTarget;
                        setVideoDuration(video.duration);
                        video.currentTime = frameTime;
                      }}
                      className="w-full rounded"
                    />

                    <input
                      type="range"
                      min="0"
                      max={videoDuration}
                      value={frameTime}
                      onChange={(e) => {
                        const time = parseFloat(e.target.value);
                        setFrameTime(time);
                        if (videoPreviewRef.current) {
                          videoPreviewRef.current.currentTime = time;
                        }
                      }}
                      className="w-full"
                    />

                    <Button
                      type="button"
                      onClick={extractThumbnail}
                      className="w-full bg-gold hover:bg-gold/90 text-black font-bold"
                    >
                      Extrair Capa
                    </Button>

                    {selectedThumbnail && (
                      <img src={selectedThumbnail} alt="Thumbnail" className="w-full rounded" />
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-gold hover:bg-gold/90 text-black font-bold"
                  >
                    {editingId ? 'Atualizar' : 'Criar'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setFormData({
                        name: '',
                        role: '',
                        quote: '',
                        mediaUrl: '',
                        mediaType: 'image',
                        language: 'pt',
                        thumbnailUrl: '',
                      });
                    }}
                    variant="outline"
                    className="flex-1 border-gold/30 text-gold"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        )}

        {/* List */}
        <div className="grid gap-4">
          {testimonialsQuery.data?.map((testimonial: any) => (
            <Card key={testimonial.id} className="bg-gray-900/50 border-gold/20 p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gold">{testimonial.name}</h3>
                  <p className="text-gray-400">{testimonial.role}</p>
                  <p className="text-gray-300 mt-2">{testimonial.quote}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleToggleActive(testimonial.id, testimonial.isActive)}
                    variant="outline"
                    className="border-gold/30 text-gold"
                  >
                    {testimonial.isActive ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingId(testimonial.id);
                      setFormData(testimonial);
                      setShowForm(true);
                    }}
                    variant="outline"
                    className="border-gold/30 text-gold"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDelete(testimonial.id)}
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setLocation('/painel/admin')}
            className="text-gold hover:text-gold/80 text-sm font-semibold py-2"
          >
            ← Voltar ao Painel Admin
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
