import { useState } from 'react';
import { Check, Edit2, Star, Trash2, X } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { US_STATES } from '@/lib/usStates';

type ReviewForm = {
  id: number;
  name: string;
  email: string;
  city: string;
  state: string;
  quote: string;
  rating: number;
  language: 'pt' | 'en' | 'es';
};

export default function AdminReviews() {
  const reviewsQuery = trpc.testimonials.getAll.useQuery();
  const updateMutation = trpc.testimonials.update.useMutation();
  const decisionMutation = trpc.testimonials.setAdminDecision.useMutation();
  const deleteMutation = trpc.testimonials.delete.useMutation();
  const [editing, setEditing] = useState<ReviewForm | null>(null);

  const reviews = (reviewsQuery.data || []).filter((review: any) => review.source === 'client');

  const refresh = async () => { await reviewsQuery.refetch(); };

  const decide = async (review: any, decision: 'approved' | 'rejected') => {
    try {
      await decisionMutation.mutateAsync({ id: review.id, decision });
      toast.success(decision === 'approved' ? 'Avaliação aprovada e publicada.' : 'Avaliação recusada.');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível alterar a avaliação.');
    }
  };

  const remove = async (review: any) => {
    if (!confirm(`Excluir definitivamente a avaliação de ${review.name}?`)) return;
    try {
      await deleteMutation.mutateAsync({ id: review.id });
      toast.success('Avaliação excluída.');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir a avaliação.');
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    try {
      await updateMutation.mutateAsync({
        id: editing.id,
        name: editing.name,
        email: editing.email,
        role: `${editing.city}, ${editing.state}`,
        city: editing.city,
        state: editing.state,
        quote: editing.quote,
        rating: editing.rating,
        language: editing.language,
      });
      toast.success('Avaliação atualizada.');
      setEditing(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a avaliação.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white lg:pl-64">
      <AdminSidebar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.2em] text-gold">Conteúdo</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Avaliações dos clientes</h1>
          <p className="mt-2 text-gray-400">Aprove, oculte, edite ou exclua as avaliações recebidas pelo formulário público.</p>
        </div>

        {editing && (
          <Card className="border-gold/25 bg-[#101b2b] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gold">Editar avaliação</h2>
              <button type="button" onClick={() => setEditing(null)} className="text-gray-400 hover:text-white" aria-label="Fechar"><X size={20} /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} placeholder="Nome" required />
                <Input type="email" value={editing.email} onChange={event => setEditing({ ...editing, email: event.target.value })} placeholder="E-mail" required />
                <Input value={editing.city} onChange={event => setEditing({ ...editing, city: event.target.value })} placeholder="Cidade" required />
                <select value={editing.state} onChange={event => setEditing({ ...editing, state: event.target.value })} className="rounded border border-gold/30 bg-black px-4 py-2 text-white" required><option value="">Estado</option>{US_STATES.map(state => <option key={state} value={state}>{state}</option>)}</select>
                <select value={editing.language} onChange={event => setEditing({ ...editing, language: event.target.value as ReviewForm['language'] })} className="rounded border border-gold/30 bg-black px-4 py-2 text-white">
                  <option value="pt">Português</option><option value="en">English</option><option value="es">Español</option>
                </select>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-300">Nota</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(value => (
                    <button type="button" key={value} onClick={() => setEditing({ ...editing, rating: value })} aria-label={`${value} estrelas`}>
                      <Star size={28} strokeWidth={value <= editing.rating ? 0 : 2} className={value <= editing.rating ? 'text-gold' : 'text-gray-500'} style={value <= editing.rating ? { fill: '#d4af37' } : undefined} />
                    </button>
                  ))}
                </div>
              </div>
              <Textarea value={editing.quote} onChange={event => setEditing({ ...editing, quote: event.target.value })} rows={5} minLength={20} maxLength={1500} required />
              <div className="flex gap-3"><Button type="submit" className="bg-gold text-black">Salvar alterações</Button><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button></div>
            </form>
          </Card>
        )}

        <div className="grid gap-5">
          {reviewsQuery.isLoading && <Card className="border-gold/20 bg-black p-8 text-center text-gray-400">Carregando avaliações...</Card>}
          {!reviewsQuery.isLoading && reviews.length === 0 && <Card className="border-gold/20 bg-black p-8 text-center text-gray-400">Nenhuma avaliação recebida.</Card>}
          {reviews.map((review: any) => (
            <Card key={review.id} className="border-gold/20 bg-[#0b1524] p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <p className="text-lg font-bold text-white">{review.name}</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${review.adminDecision === 'approved' ? 'bg-green-500/15 text-green-300' : review.adminDecision === 'rejected' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>{review.adminDecision === 'approved' ? 'Publicada' : review.adminDecision === 'rejected' ? 'Recusada pelo administrador' : 'Aguardando decisão final'}</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">Agente: {review.agentDecision === 'approved' ? 'recomendou aprovar' : review.agentDecision === 'rejected' ? 'recomendou recusar' : 'ainda não analisou'}</span>
                  </div>
                  <div className="mb-4 flex gap-1" aria-label={`${review.rating} de 5 estrelas`}>
                    {[1, 2, 3, 4, 5].map(value => <Star key={value} size={20} strokeWidth={value <= review.rating ? 0 : 2} className={value <= review.rating ? 'text-gold' : 'text-gray-600'} style={value <= review.rating ? { fill: '#d4af37' } : undefined} />)}
                  </div>
                  <blockquote className="text-base leading-relaxed text-gray-200">“{review.quote}”</blockquote>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-400"><span>{review.city || review.role}{review.state ? `, ${review.state}` : ''}</span><span>{review.email}</span><span>Agente: {review.agentEmail || 'não informado'}</span><span>{String(review.language).toUpperCase()}</span></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => decide(review, 'approved')} className="bg-green-600 text-white hover:bg-green-500"><Check size={16} className="mr-2" />Aprovar</Button>
                  <Button size="sm" onClick={() => decide(review, 'rejected')} className="bg-red-600 text-white hover:bg-red-500"><X size={16} className="mr-2" />Recusar</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing({ id: review.id, name: review.name, email: review.email || '', city: review.city || String(review.role || '').split(',')[0] || '', state: review.state || String(review.role || '').split(',')[1]?.trim() || '', quote: review.quote, rating: review.rating, language: review.language })}><Edit2 size={16} className="mr-2" />Editar</Button>
                  <Button size="sm" variant="outline" onClick={() => remove(review)} className="border-red-500/40 text-red-300 hover:bg-red-500/10"><Trash2 size={16} className="mr-2" />Excluir</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
