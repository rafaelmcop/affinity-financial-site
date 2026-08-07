import { useState } from 'react';
import { Star, Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const copy = {
  pt: { eyebrow: 'SUA EXPERIÊNCIA IMPORTA', title: 'Conte como foi sua experiência', subtitle: 'Sua avaliação ajuda outras famílias a escolherem com mais confiança.', name: 'Seu nome', email: 'Seu e-mail (não será publicado)', role: 'Cidade e estado', review: 'Escreva sua avaliação', submit: 'Enviar avaliação', pending: 'Toda avaliação é revisada antes de ser publicada.', success: 'Obrigado! Sua avaliação foi enviada e aguarda aprovação.' },
  en: { eyebrow: 'YOUR EXPERIENCE MATTERS', title: 'Tell us about your experience', subtitle: 'Your review helps other families make a confident choice.', name: 'Your name', email: 'Your email (will not be published)', role: 'City and state', review: 'Write your review', submit: 'Submit review', pending: 'Every review is checked before it is published.', success: 'Thank you! Your review was submitted for approval.' },
  es: { eyebrow: 'TU EXPERIENCIA IMPORTA', title: 'Cuéntanos sobre tu experiencia', subtitle: 'Tu reseña ayuda a otras familias a elegir con confianza.', name: 'Tu nombre', email: 'Tu correo (no será publicado)', role: 'Ciudad y estado', review: 'Escribe tu reseña', submit: 'Enviar reseña', pending: 'Cada reseña se revisa antes de publicarse.', success: '¡Gracias! Tu reseña fue enviada para aprobación.' },
};

export function ReviewSubmissionSection() {
  const { language } = useLanguage();
  const text = copy[language];
  const mutation = trpc.testimonials.submitReview.useMutation();
  const [rating, setRating] = useState(5);
  const [form, setForm] = useState({ name: '', email: '', role: '', quote: '' });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync({ ...form, rating, language });
      setForm({ name: '', email: '', role: '', quote: '' });
      setRating(5);
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
          <div className="flex gap-2" aria-label={`${rating} de 5 estrelas`}>
            {[1, 2, 3, 4, 5].map(star => <button type="button" key={star} onClick={() => setRating(star)} className="p-1" aria-label={`${star} estrelas`}><Star size={30} className={star <= rating ? 'fill-gold text-gold' : 'text-gray-600'} /></button>)}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input required minLength={2} maxLength={120} placeholder={text.name} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-12 bg-white/5 border-white/15 text-white placeholder:text-gray-500" />
            <Input required type="email" maxLength={320} placeholder={text.email} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-12 bg-white/5 border-white/15 text-white placeholder:text-gray-500" />
          </div>
          <Input required minLength={2} maxLength={120} placeholder={text.role} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="h-12 bg-white/5 border-white/15 text-white placeholder:text-gray-500" />
          <Textarea required minLength={20} maxLength={1500} rows={6} placeholder={text.review} value={form.quote} onChange={e => setForm({ ...form, quote: e.target.value })} className="bg-white/5 border-white/15 text-white placeholder:text-gray-500 resize-none" />
          <Button disabled={mutation.isPending} className="w-full h-12 bg-gold hover:bg-gold/90 text-black font-bold">{mutation.isPending ? 'Enviando...' : <><Send size={18} className="mr-2" />{text.submit}</>}</Button>
        </form>
      </div>
    </section>
  );
}
