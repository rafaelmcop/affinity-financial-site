import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { localizeTestimonial } from '@/lib/testimonialTranslations';

const ROTATION_TIME = 10_000;

const copy = {
  pt: { eyebrow: 'AVALIAÇÕES DOS CLIENTES', title: 'Experiências compartilhadas', subtitle: 'Avaliações enviadas por nossos clientes e aprovadas pela Affinity.', previous: 'Avaliação anterior', next: 'Próxima avaliação', show: 'Mostrar avaliação', stars: 'de 5 estrelas' },
  en: { eyebrow: 'CLIENT REVIEWS', title: 'Shared experiences', subtitle: 'Reviews submitted by our clients and approved by Affinity.', previous: 'Previous review', next: 'Next review', show: 'Show review', stars: 'out of 5 stars' },
  es: { eyebrow: 'RESEÑAS DE CLIENTES', title: 'Experiencias compartidas', subtitle: 'Reseñas enviadas por nuestros clientes y aprobadas por Affinity.', previous: 'Reseña anterior', next: 'Siguiente reseña', show: 'Mostrar reseña', stars: 'de 5 estrellas' },
};

export function ReviewsBanner() {
  const { language } = useLanguage();
  const text = copy[language];
  const reviewsQuery = trpc.testimonials.getLocalized.useQuery({ language });
  const [currentIndex, setCurrentIndex] = useState(0);

  const reviews = useMemo(() => {
    const clientReviews = (reviewsQuery.data || []).filter((item: any) => item.source === 'client');
    return clientReviews.map((item: any) => localizeTestimonial(item, language));
  }, [reviewsQuery.data, language]);

  useEffect(() => {
    if (reviews.length < 2) return;
    const timer = window.setInterval(() => {
      setCurrentIndex(index => (index + 1) % reviews.length);
    }, ROTATION_TIME);
    return () => window.clearInterval(timer);
  }, [reviews.length]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [language, reviews.length]);

  if (reviews.length === 0) return null;

  const review = reviews[currentIndex];
  const goTo = (index: number) => setCurrentIndex((index + reviews.length) % reviews.length);

  return (
    <section id="reviews" className="relative overflow-hidden border-y border-gold/20 bg-[#081321] py-16 sm:py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(212,175,55,.09),transparent_42%)]" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-9 text-center">
          <p className="mb-3 text-xs font-bold tracking-[.28em] text-gold sm:text-sm">{text.eyebrow}</p>
          <h2 className="reviews-title text-3xl font-bold text-white sm:text-4xl">{text.title}</h2>
          <p className="reviews-subtitle mx-auto mt-3 max-w-2xl text-gray-300">{text.subtitle}</p>
        </div>

        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-6">
          <button type="button" onClick={() => goTo(currentIndex - 1)} className="rounded-full border border-gold/30 bg-black/30 p-2 text-gold transition-colors hover:bg-gold hover:text-black sm:p-3" aria-label={text.previous}>
            <ChevronLeft size={22} />
          </button>

          <article key={review.id} className="relative min-h-[270px] rounded-2xl border border-gold/25 bg-white/[.06] px-6 py-8 text-center shadow-2xl backdrop-blur sm:min-h-[250px] sm:px-12 sm:py-10">
            <Quote className="absolute left-5 top-5 text-gold/20" size={48} aria-hidden="true" />
            <div className="mb-5 flex justify-center gap-1" aria-label={`${review.rating} ${text.stars}`}>
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  size={24}
                  strokeWidth={star <= review.rating ? 0 : 2}
                  className={star <= review.rating ? 'text-gold' : 'fill-transparent text-gray-500'}
                  style={star <= review.rating ? { fill: '#d4af37' } : undefined}
                />
              ))}
            </div>
            <blockquote className="review-quote mx-auto max-w-3xl text-lg italic leading-relaxed text-white sm:text-2xl">
              “{review.quote}”
            </blockquote>
            <div className="mt-7">
              <p className="font-bold text-gold">{review.name}</p>
              <p className="review-role mt-1 text-sm text-gray-400">{review.role}</p>
            </div>
          </article>

          <button type="button" onClick={() => goTo(currentIndex + 1)} className="rounded-full border border-gold/30 bg-black/30 p-2 text-gold transition-colors hover:bg-gold hover:text-black sm:p-3" aria-label={text.next}>
            <ChevronRight size={22} />
          </button>
        </div>

        <div className="mx-auto mt-7 flex max-w-md justify-center gap-2">
          {reviews.map((item: any, index: number) => (
            <button key={item.id} type="button" onClick={() => goTo(index)} aria-label={`${text.show} ${index + 1}`} className={`h-2 rounded-full transition-all ${index === currentIndex ? 'w-9 bg-gold' : 'w-2 bg-gold/30 hover:bg-gold/60'}`} />
          ))}
        </div>
        {reviews.length > 1 && <div key={`progress-${currentIndex}`} className="mx-auto mt-4 h-0.5 max-w-md overflow-hidden rounded bg-white/10"><div className="h-full origin-left animate-[review-progress_10s_linear_forwards] bg-gold" /></div>}
      </div>
    </section>
  );
}
