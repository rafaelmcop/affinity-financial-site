import { useState, useRef } from 'react';
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

  const testimonialsQuery = trpc.testimonials.getAll.useQuery();
  const createMutation = trpc.testimonials.create.useMutation();
  const updateMutation = trpc.testimonials.update.useMutation();
  const deleteMutation = trpc.testimonials.delete.useMutation();
  const toggleActiveMutation = trpc.testimonials.toggleActive.useMutation();

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

      if (!response.ok) {
        throw new Error('Erro ao fazer upload do arquivo');
      }

      const data = await response.json();
      const mediaUrl = data.url || data.path;

      // Detect media type from file
      const isVideo = file.type.startsWith('video/');
      
      setFormData({
        ...formData,
        mediaUrl,
        mediaType: isVideo ? 'video' : 'image',
        thumbnailUrl: '',
      });

      // Reset frame selector
      setFrameTime(1);
      setSelectedThumbnail(null);

      toast.success('Arquivo enviado com sucesso!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoPreviewRef.current) {
      setVideoDuration(videoPreviewRef.current.duration);
      // Auto-extract thumbnail at 1 second
      videoPreviewRef.current.currentTime = 1;
    }
  };

  const handleVideoSeeked = () => {
    if (videoPreviewRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoPreviewRef.current, 0, 0);
        const thumbnail = canvasRef.current.toDataURL('image/jpeg', 0.85);
        setSelectedThumbnail(thumbnail);
      }
    }
  };

  const handleFrameTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setFrameTime(newTime);
    if (videoPreviewRef.current) {
      videoPreviewRef.current.currentTime = newTime;
    }
  };

  const handleAddOrUpdateTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Update existing
        await updateMutation.mutateAsync({
          id: editingId,
          name: formData.name,
          role: formData.role,
          quote: formData.quote,
          mediaUrl: formData.mediaUrl || undefined,
          mediaType: formData.mediaType,
          language: formData.language,
          thumbnailUrl: selectedThumbnail || undefined,
        });
        toast.success('Depoimento atualizado com sucesso!');
      } else {
        // Create new
        await createMutation.mutateAsync({
          name: formData.name,
          role: formData.role,
          quote: formData.quote,
          mediaUrl: formData.mediaUrl || undefined,
          mediaType: formData.mediaType,
          language: formData.language,
          thumbnailUrl: selectedThumbnail || undefined,
        });
        toast.success('Depoimento adicionado com sucesso!');
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
      setShowFrameSelector(false);
      setSelectedThumbnail(null);
      setFrameTime(1);
      await testimonialsQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar depoimento');
    }
  };

  const handleEditTestimonial = (testimonial: any) => {
    setFormData({
      name: testimonial.name,
      role: testimonial.role,
      quote: testimonial.quote,
      mediaUrl: testimonial.mediaUrl || '',
      mediaType: testimonial.mediaType || 'image',
      language: testimonial.language || 'pt',
      thumbnailUrl: testimonial.thumbnailUrl || '',
    });
    setSelectedThumbnail(testimonial.thumbnailUrl || null);
    setEditingId(testimonial.id);
    setShowForm(true);
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

  const handleCancelEdit = () => {
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
    setShowFrameSelector(false);
    setSelectedThumbnail(null);
    setFrameTime(1);
  };

  const testimonials = testimonialsQuery.data || [];

  return (
    <div className="min-h-screen bg-black">
      <Header title="Gerenciar Depoimentos" userType="admin" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div></div>
          <Button
            onClick={() => {
              if (showForm && !editingId) {
                setShowForm(false);
              } else {
                setShowForm(!showForm);
                if (editingId) {
                  handleCancelEdit();
                }
              }
            }}
            className="bg-gold text-black hover:bg-gold/90 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Depoimento
          </Button>
        </div>

        {showForm && (
          <Card className="bg-black border-gold/20 p-6 mb-6">
            <h3 className="text-xl font-semibold text-gold mb-4">
              {editingId ? 'Editar Depoimento' : 'Adicionar Depoimento'}
            </h3>
            <form onSubmit={handleAddOrUpdateTestimonial} className="space-y-4">
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

              {/* File Upload Section */}
              <div className="border-2 border-dashed border-gold/30 rounded-lg p-6 text-center">
                <div className="flex flex-col items-center gap-3">
                  <Upload className="w-8 h-8 text-gold" />
                  <div>
                    <p className="text-white font-semibold">Enviar Arquivo de Mídia</p>
                    <p className="text-gray-400 text-sm">Vídeo ou Imagem</p>
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.parentElement?.querySelector('input')?.click();
                      }}
                      disabled={isUploading}
                      className="bg-gold/20 text-gold hover:bg-gold/30 border border-gold/30"
                    >
                      {isUploading ? 'Enviando...' : 'Selecionar Arquivo'}
                    </Button>
                  </label>
                </div>
              </div>

              {/* Media URL Display */}
              {formData.mediaUrl && (
                <div className="bg-gold/10 border border-gold/30 rounded p-4">
                  <p className="text-gold text-sm font-semibold mb-2">Mídia Selecionada:</p>
                  <p className="text-gray-300 text-sm break-all">{formData.mediaUrl}</p>
                  
                  {formData.mediaType === 'video' && (
                    <div className="mt-4 space-y-4">
                      <video
                        ref={videoPreviewRef}
                        src={formData.mediaUrl}
                        onLoadedMetadata={handleVideoLoadedMetadata}
                        onSeeked={handleVideoSeeked}
                        className="w-full h-40 rounded bg-black"
                      />
                      
                      {/* Frame Selector */}
                      <div className="bg-black border border-gold/20 rounded p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Sliders className="w-4 h-4 text-gold" />
                          <p className="text-gold font-semibold text-sm">Selecionar Quadro para Capa</p>
                        </div>
                        
                        <div className="space-y-2">
                          <input
                            type="range"
                            min="0"
                            max={videoDuration || 0}
                            step="0.1"
                            value={frameTime}
                            onChange={handleFrameTimeChange}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>{frameTime.toFixed(1)}s</span>
                            <span>{videoDuration.toFixed(1)}s</span>
                          </div>
                        </div>

                        {/* Thumbnail Preview */}
                        {selectedThumbnail && (
                          <div className="mt-3">
                            <p className="text-gray-300 text-xs mb-2">Capa Selecionada:</p>
                            <img
                              src={selectedThumbnail}
                              alt="Thumbnail"
                              className="w-full h-32 object-cover rounded border border-gold/20"
                            />
                          </div>
                        )}
                      </div>

                      {/* Hidden Canvas for Thumbnail Extraction */}
                      <canvas
                        ref={canvasRef}
                        className="hidden"
                        width={320}
                        height={180}
                      />
                    </div>
                  )}
                  
                  {formData.mediaType === 'image' && (
                    <img
                      src={formData.mediaUrl}
                      alt="Preview"
                      className="w-full h-40 object-cover mt-3 rounded"
                    />
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  {editingId ? 'Atualizar' : 'Adicionar'}
                </Button>
                <Button
                  type="button"
                  onClick={handleCancelEdit}
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
                            onClick={() => handleEditTestimonial(testimonial)}
                            className="text-blue-400 hover:text-blue-300 transition"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
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
