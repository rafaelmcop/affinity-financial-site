import { useState } from 'react';
import { Star, Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { US_STATES } from '@/lib/usStates';

const copy = {
  pt: { eyebrow: 'SUA EXPERIÊNCIA IMPORTA', title: 'Conte como foi sua experiência', subtitle: 'Sua avaliação ajuda outras famílias a escolherem com mais confiança.', rating: 'Escolha uma nota de 1 a 5 estrelas', ratingRequired: 'Escolha uma nota antes de enviar.', name: 'Seu nome', email: 'Seu e-mail (não será publicado)', city: 'Cidade', state: 'Estado', agent: 'Qual agente atendeu você?', review: 'Escreva sua avaliação', submit: 'Enviar avaliação', pending: 'A avaliação passa pelo agente e pela aprovação final da administração.', success: 'Obrigado! Sua avaliação foi enviada e aguarda aprovação.' },
  en: { eyebrow: 'YOUR EXPERIENCE MATTERS', title: 'Tell us about your experience', subtitle: 'Your review helps other families make a confident choice.', rating: 'Choose a rating from 1 to 5 stars', ratingRequired: 'Choose a rating before submitting.', name: 'Your name', email: 'Your email (will not be published)', city: 'City', state: 'State', agent: 'Which agent helped you?', review: 'Write your review', submit: 'Submit review', pending: 'The agent reviews it first and administration makes the final decision.', success: 'Thank you! Your review was submitted for approval.' },
  es: { eyebrow: 'TU EXPERIENCIA IMPORTA', title: 'Cuéntanos sobre tu experiencia', subtitle: 'Tu reseña ayuda a otras familias a elegir con confianza.', rating: 'Elige una calificación de 1 a 5 estrellas', ratingRequired: 'Elige una calificación antes de enviar.', name: 'Tu nombre', email: 'Tu correo (no será publicado)', city: 'Ciudad', state: 'Estado', agent: '¿Qué agente te atendió?', review: 'Escribe tu reseña', submit: 'Enviar reseña', pending: 'El agente la revisa primero y la administración toma la decisión final.', success: '¡Gracias! Tu reseña fue enviada para aprobación.' },
};

export function ReviewSubmissionSection() {
  const { language } = useLanguage();
  const text = copy[language];
  const mutation = trpc.testimonials.submitReview.useMutation();
  const agents = trpc.testimonials.getAgentOptions.useQuery();
  const [rating, setRating] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', city: '', state: '', agentId: 0, quote: '' });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (rating === 0) {
      toast.error(text.ratingRequired);
      return;
    }
    try {
      await mutation.mutateAsync({ ...form, rating, language });
      setForm({ name: '', email: '', city: '', state: '', agentId: 0, quote: '' });
      setRating(0);
      toast.success(text.success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar sua avaliação.');
    }
  };

  return (
    <section id="review" className="py-20 bg-[#07111f] border-y border-gold/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[.85fr_1.15fr] gap-12 items-center">
        <div>
          <p className="text-gold text-sm tracking-[.24em] font-semibold mb-4">{text.eyebrow}</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-5">{text.title}</h2>
          <p className="text-lg text-gray-300 leading-relaxed mb-7">{text.subtitle}</p>
          <div className="flex items-center gap-3 text-sm text-gray-400"><ShieldCheck className="text-gold" size={22} /><span>{text.pending}</span></div>
        </div>
        <form onSubmit={submit} className="rounded-2xl border border-gold/25 bg-black/35 p-6 sm:p-8 shadow-2xl space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold text-white">{text.rating}</p>
            <div className="flex gap-2" role="radiogroup" aria-label={text.rating}>
              {[1, 2, 3, 4, 5].map(star => (
                <button type="button" role="radio" aria-checked={rating === star} key={star} onClick={() => setRating(star)} className="rounded p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold" aria-label={`${star} estrelas`}>
                  <Star
                    size={32}
                    strokeWidth={star <= rating ? 0 : 2}
                    className={star <= rating ? 'text-gold' : 'fill-transparent text-gray-400'}
                    style={star <= rating ? { fill: '#d4af37' } : undefined}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input required minLength={2} maxLength={120} placeholder={text.name} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-12 bg-white/5 border-white/15 text-white placeholder:text-gray-500" />
            <Input required type="email" maxLength={320} placeholder={text.email} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-12 bg-white/5 border-white/15 text-white placeholder:text-gray-500" />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <Input required minLength={2} maxLength={120} placeholder={text.city} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="h-12 bg-white/5 border-white/15 text-white placeholder:text-gray-500" />
            <select required aria-label={text.state} value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="h-12 rounded-md border border-white/15 bg-[#101a28] px-3 text-white">
              <option value="">{text.state}</option>{US_STATES.map(state => <option key={state} value={state}>{state}</option>)}
            </select>
          </div>
          <select required aria-label={text.agent} value={form.agentId || ''} onChange={e => setForm({ ...form, agentId: Number(e.target.value) })} className="h-12 w-full rounded-md border border-white/15 bg-[#101a28] px-3 text-white">
            <option value="">{text.agent}</option>{(agents.data || []).map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
          </select>
          <Textarea required minLength={20} maxLength={1500} rows={6} placeholder={text.review} value={form.quote} onChange={e => setForm({ ...form, quote: e.target.value })} className="bg-white/5 border-white/15 text-white placeholder:text-gray-500 resize-none" />
          <Button disabled={mutation.isPending} className="w-full h-12 bg-gold hover:bg-gold/90 text-black font-bold">{mutation.isPending ? 'Enviando...' : <><Send size={18} className="mr-2" />{text.submit}</>}</Button>
        </form>
      </div>
    </section>
  );
}
