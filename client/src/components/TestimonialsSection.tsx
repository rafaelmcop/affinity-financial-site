import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function TestimonialsSection() {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  const testimonials = [
    {
      name: t('testimonials.testimonial_1.name'),
      role: t('testimonials.testimonial_1.role'),
      quote: t('testimonials.testimonial_1.quote'),
      image: t('testimonials.testimonial_1.image'),
    },
    {
      name: t('testimonials.testimonial_2.name'),
      role: t('testimonials.testimonial_2.role'),
      quote: t('testimonials.testimonial_2.quote'),
      image: t('testimonials.testimonial_2.image'),
    },
    {
      name: t('testimonials.testimonial_3.name'),
      role: t('testimonials.testimonial_3.role'),
      quote: t('testimonials.testimonial_3.quote'),
      image: t('testimonials.testimonial_3.image'),
    },
  ];

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

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
                        {/* Image */}
                        <div className="flex-shrink-0 md:w-1/3">
                          <img
                            src={testimonial.image}
                            alt={testimonial.name}
                            className="w-full h-64 object-cover rounded-lg border-2 border-gold/30"
                          />
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
        </div>
      </div>
    </section>
  );
}
