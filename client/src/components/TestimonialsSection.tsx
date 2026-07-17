import { Card } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';

export function TestimonialsSection() {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get active testimonials from database
  const testimonialsQuery = trpc.testimonials.getActive.useQuery();

  useEffect(() => {
    if (testimonialsQuery.data) {
      // Filter by current language
      const currentLang = localStorage.getItem('language') || 'pt';
      const filtered = testimonialsQuery.data.filter((t: any) => t.language === currentLang);
      
      // If no testimonials for current language, show Portuguese ones
      const toShow = filtered.length > 0 ? filtered : testimonialsQuery.data.filter((t: any) => t.language === 'pt');
      
      setTestimonials(toShow);
      setIsLoading(false);
    }
  }, [testimonialsQuery.data]);

  const nextTestimonial = () => {
    if (testimonials.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }
  };

  const prevTestimonial = () => {
    if (testimonials.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    }
  };

  if (isLoading || testimonials.length === 0) {
    return (
      <section id="testimonials" className="py-20 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              {t('testimonials.title')}
            </h2>
            <p className="text-xl text-gray-300">
              {t('testimonials.subtitle')}
            </p>
            <div className="w-20 h-1 bg-gold mx-auto mt-6" />
          </div>
          <div className="text-center text-gray-400">
            Carregando depoimentos...
          </div>
        </div>
      </section>
    );
  }

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section id="testimonials" className="py-20 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {t('testimonials.title')}
          </h2>
          <p className="text-xl text-gray-300">
            {t('testimonials.subtitle')}
          </p>
          <div className="w-20 h-1 bg-gold mx-auto mt-6" />
        </div>

        {/* Testimonials Carousel */}
        <div className="relative">
          <div className="overflow-hidden">
            <div
              className="transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${currentIndex * 100}%)`,
              }}
            >
              <div className="flex">
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="w-full flex-shrink-0">
                    <Card className="bg-gradient-to-br from-gray-900 to-black border-gold/30 p-8 sm:p-12">
                      <div className="flex flex-col md:flex-row gap-8 items-center">
                        {/* Media (Image or Video) */}
                        <div className="flex-shrink-0 md:w-1/3">
                          {testimonial.mediaType === 'video' && testimonial.mediaUrl ? (
                            <video
                              src={testimonial.mediaUrl}
                              controls
                              className="w-full h-64 object-cover rounded-lg border-2 border-gold/30 bg-black"
                              poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23000' width='100' height='100'/%3E%3Cpolygon fill='%23d4af37' points='35,25 35,75 75,50'/%3E%3C/svg%3E"
                            />
                          ) : testimonial.mediaUrl ? (
                            <img
                              src={testimonial.mediaUrl}
                              alt={testimonial.name}
                              className="w-full h-64 object-cover rounded-lg border-2 border-gold/30"
                            />
                          ) : (
                            <div className="w-full h-64 bg-gradient-to-br from-gold/20 to-gold/5 rounded-lg border-2 border-gold/30 flex items-center justify-center">
                              <span className="text-4xl">👤</span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="md:w-2/3">
                          <div className="mb-6">
                            <svg
                              className="w-8 h-8 text-gold mb-4"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-4.25-2-7-2s-7 .75-7 2v10c0 1 0 7 7 7z" />
                              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-4.25-2-7-2s-7 .75-7 2v10c0 1 0 7 7 7z" />
                            </svg>
                          </div>

                          <p className="text-lg text-gray-200 italic mb-6 leading-relaxed">
                            "{testimonial.quote}"
                          </p>

                          <div>
                            <p className="text-gold font-bold text-lg">
                              {testimonial.name}
                            </p>
                            <p className="text-gray-400">
                              {testimonial.role}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          {testimonials.length > 1 && (
            <>
              <button
                onClick={prevTestimonial}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-12 md:-translate-x-16 bg-gold hover:bg-gold/80 text-black p-3 rounded-full transition-all duration-300"
                aria-label="Previous testimonial"
              >
                <ChevronLeft size={24} />
              </button>

              <button
                onClick={nextTestimonial}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-12 md:translate-x-16 bg-gold hover:bg-gold/80 text-black p-3 rounded-full transition-all duration-300"
                aria-label="Next testimonial"
              >
                <ChevronRight size={24} />
              </button>

              {/* Dots */}
              <div className="flex justify-center gap-2 mt-8">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentIndex
                        ? 'bg-gold w-8'
                        : 'bg-gold/30 w-2 hover:bg-gold/50'
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
