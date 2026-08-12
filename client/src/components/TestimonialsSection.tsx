import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Star, PenLine } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { getVideoSource } from '@shared/videoUrl';
import { localizeTestimonial } from '@/lib/testimonialTranslations';

export function TestimonialsSection() {
  const { t, language } = useLanguage();
  const reviewLinkLabel = { pt: 'Deixe sua avaliação', en: 'Leave your review', es: 'Deja tu reseña' }[language];
  const amountLabel = { pt: 'Valor recebido', en: 'Benefit received', es: 'Valor recibido' }[language];
  const amountLocale = { pt: 'pt-BR', en: 'en-US', es: 'es-US' }[language];
  const interfaceText = {
    pt: { loading: 'Carregando depoimentos...', previous: 'Depoimento anterior', next: 'Próximo depoimento', stars: 'de 5 estrelas' },
    en: { loading: 'Loading testimonials...', previous: 'Previous testimonial', next: 'Next testimonial', stars: 'out of 5 stars' },
    es: { loading: 'Cargando testimonios...', previous: 'Testimonio anterior', next: 'Siguiente testimonio', stars: 'de 5 estrellas' },
  }[language];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [videoThumbnails, setVideoThumbnails] = useState<Record<number, string>>({});
  const [loadedThumbnails, setLoadedThumbnails] = useState<Set<number>>(new Set());
  const [processedIndices, setProcessedIndices] = useState<Set<number>>(new Set());

  // Get active testimonials from database
  const testimonialsQuery = trpc.testimonials.getActive.useQuery();

  // Shuffle array function
  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Extract thumbnail from video with guaranteed loading
  const extractVideoThumbnail = (videoUrl: string, index: number, onComplete?: () => void) => {
    // Skip if already processed
    if (processedIndices.has(index)) {
      if (onComplete) onComplete();
      return;
    }

    const video = document.createElement('video');
    video.src = encodeURI(videoUrl);
    video.crossOrigin = 'anonymous';
    video.currentTime = 1; // Get frame at 1 second

    let metadataLoaded = false;

    const extractThumbnail = () => {
      if (!metadataLoaded) return;
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        setVideoThumbnails((prev) => ({
          ...prev,
          [index]: thumbnail,
        }));
        setLoadedThumbnails((prev) => new Set(Array.from(prev).concat(index)));
        setProcessedIndices((prev) => new Set(Array.from(prev).concat(index)));
      }
      if (onComplete) onComplete();
    };

    video.onloadedmetadata = () => {
      metadataLoaded = true;
      extractThumbnail();
    };

    video.onseeked = () => {
      if (metadataLoaded) {
        extractThumbnail();
      }
    };

    video.onerror = () => {
      console.log('Não foi possível extrair thumbnail do vídeo:', videoUrl);
      setProcessedIndices((prev) => new Set(Array.from(prev).concat(index)));
      if (onComplete) onComplete();
    };
  };

  // Load thumbnail for current and adjacent testimonials (lazy loading)
  useEffect(() => {
    if (testimonials.length === 0) return;

    // Determine which indices to load
    const indicesToLoad = [
      currentIndex,
      (currentIndex - 1 + testimonials.length) % testimonials.length,
      (currentIndex + 1) % testimonials.length,
    ];

    indicesToLoad.forEach((index) => {
      const testimonial = testimonials[index];
      if (
        testimonial.mediaType === 'video' &&
        testimonial.mediaUrl &&
        getVideoSource(testimonial.mediaUrl)?.kind === 'file' &&
        !processedIndices.has(index) &&
        !loadedThumbnails.has(index)
      ) {
        extractVideoThumbnail(testimonial.mediaUrl, index);
      }
    });
  }, [currentIndex, testimonials, processedIndices, loadedThumbnails]);

  useEffect(() => {
    if (testimonialsQuery.data) {
      setIsLoading(true);
      
      const manualTestimonials = testimonialsQuery.data.filter((t: any) => t.source !== 'client');
      const toShow = manualTestimonials.map((item: any) => localizeTestimonial(item, language));
      
      // Shuffle testimonials for random display
      const shuffled = shuffleArray(toShow);
      setTestimonials(shuffled);
      
      // Load only the first testimonial thumbnail initially (lazy loading)
      if (shuffled.length > 0 && shuffled[0].mediaType === 'video' && shuffled[0].mediaUrl && getVideoSource(shuffled[0].mediaUrl)?.kind === 'file') {
        setIsLoadingThumbnails(true);
        extractVideoThumbnail(shuffled[0].mediaUrl, 0, () => {
          setIsLoadingThumbnails(false);
        });
      }
      
      // Simulate minimum loading time for smooth animation
      setTimeout(() => {
        setIsLoading(false);
        setShowLoadingOverlay(false);
      }, 300);
    }
  }, [testimonialsQuery.data, language]);

  // Intersection Observer to pause video when out of view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (!entry.isIntersecting) {
          // Pause all videos when container is out of view
          Object.values(videoRefs.current).forEach((video) => {
            if (video) {
              video.pause();
              video.currentTime = 0;
            }
          });
        }
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  // Pause ALL videos when changing testimonial
  useEffect(() => {
    Object.values(videoRefs.current).forEach((video) => {
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex]);

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

  const toggleFullscreen = (index: number) => {
    const video = videoRefs.current[index];
    if (video) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if ((video as any).webkitRequestFullscreen) {
        (video as any).webkitRequestFullscreen();
      } else if ((video as any).mozRequestFullScreen) {
        (video as any).mozRequestFullScreen();
      } else if ((video as any).msRequestFullscreen) {
        (video as any).msRequestFullscreen();
      }
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
          <div className="flex justify-center items-center py-12">
            <div className="flex flex-col items-center gap-4">
              {/* Animated Spinner */}
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-gold/20" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-gold animate-spin" />
              </div>
              <p className="text-gray-400 text-sm animate-pulse">{interfaceText.loading}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const currentTestimonial = testimonials[currentIndex];
  const currentVideoSource = currentTestimonial?.mediaType === 'video' && currentTestimonial.mediaUrl
    ? getVideoSource(currentTestimonial.mediaUrl)
    : null;
  // Use custom thumbnail if available, otherwise use extracted thumbnail
  const currentThumbnail = currentTestimonial?.thumbnailUrl || videoThumbnails[currentIndex];
  const isThumbnailLoading = currentVideoSource?.kind === 'file' && !currentThumbnail && !loadedThumbnails.has(currentIndex);
  
  // Skip thumbnail extraction if custom thumbnail already exists
  const shouldExtractThumbnail = currentVideoSource?.kind === 'file' && !currentTestimonial?.thumbnailUrl && !currentThumbnail && !loadedThumbnails.has(currentIndex);

  return (
    <section
      id="testimonials"
      className="py-20 bg-gradient-to-b from-black to-gray-900"
      ref={containerRef}
    >
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

        {/* Testimonials Carousel */}
        <div className="relative">
          <div className="flex items-center justify-between gap-4 md:gap-8">
            {/* Left Arrow */}
            <button
              onClick={prevTestimonial}
              className="flex-shrink-0 p-3 rounded-full bg-gold/20 hover:bg-gold/40 text-gold transition-all duration-300 transform hover:scale-110"
              aria-label={interfaceText.previous}
            >
              <ChevronLeft size={24} />
            </button>

            {/* Testimonial Card */}
            <div className="flex-grow">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className={`transition-opacity duration-500 ${
                    index === currentIndex ? 'opacity-100' : 'opacity-0 hidden'
                  }`}
                >
                  <div className="bg-gradient-to-br from-gray-900 to-black border border-gold/30 p-8 sm:p-12 rounded-lg">
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                      {/* Media (Image or Video) */}
                      <div className="flex-shrink-0 md:w-1/3 relative group">
                        {/* Loading Skeleton */}
                        {isThumbnailLoading && (
                          <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-lg border-2 border-gold/30 animate-pulse z-10" />
                        )}
                        
                        {testimonial.mediaType === 'video' && testimonial.mediaUrl && getVideoSource(testimonial.mediaUrl) ? (
                          (() => {
                            const source = getVideoSource(testimonial.mediaUrl)!;
                            return (
                              <div className={`relative transition-opacity duration-500 ${isThumbnailLoading && source.kind === 'file' ? 'opacity-50' : 'opacity-100'}`}>
                                {source.kind === 'file' ? (
                                  <>
                                    <video
                                      ref={(el) => { if (el) videoRefs.current[index] = el; }}
                                      controls
                                      playsInline
                                      preload="metadata"
                                      className="max-h-[28rem] w-full rounded-lg border-2 border-gold/30 bg-black object-contain"
                                      poster={currentThumbnail || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23000%22 width=%22100%22 height=%22100%22/%3E%3Cpolygon fill=%22%23d4af37%22 points=%2235,25 35,75 75,50%22/%3E%3C/svg%3E'}
                                      controlsList="nodownload"
                                      src={source.url}
                                    />
                                    <button
                                      onClick={() => toggleFullscreen(index)}
                                      className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-gold/70 text-gold rounded-lg transition-all duration-300 opacity-0 group-hover:opacity-100"
                                      title="Tela inteira"
                                    >
                                      <Maximize2 size={20} />
                                    </button>
                                  </>
                                ) : (
                                  <iframe
                                    src={source.embedUrl}
                                    title={`Vídeo de ${testimonial.name}`}
                                    className="aspect-video w-full rounded-lg border-2 border-gold/30 bg-black"
                                    loading="lazy"
                                    allow="autoplay; fullscreen; picture-in-picture"
                                    allowFullScreen
                                    referrerPolicy="strict-origin-when-cross-origin"
                                  />
                                )}
                              </div>
                            );
                          })()
                        ) : testimonial.mediaUrl ? (
                          <img
                            src={encodeURI(testimonial.mediaUrl)}
                            alt={testimonial.name}
                            className="w-full h-64 object-cover rounded-lg border-2 border-gold/30"
                            onError={(e) => {
                              console.error('Erro ao carregar imagem:', testimonial.mediaUrl, e);
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23333%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2250%22 font-size=%2220%22 fill=%22%23999%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3EImagem não carregada%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        ) : (
                          <div className="w-full h-64 bg-gradient-to-br from-gold/20 to-gold/5 rounded-lg border-2 border-gold/30 flex items-center justify-center flex-col gap-2">
                            <span className="text-4xl">👤</span>
                            <p className="text-xs text-gold text-center px-2">Sem mídia</p>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="md:w-2/3">
                        {testimonial.source === 'client' && (
                          <div className="flex gap-1 mb-4" aria-label={`${testimonial.rating} ${interfaceText.stars}`}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                size={18}
                                strokeWidth={star <= testimonial.rating ? 0 : 2}
                                className={star <= testimonial.rating ? 'text-gold' : 'fill-transparent text-gray-500'}
                                style={star <= testimonial.rating ? { fill: '#d4af37' } : undefined}
                              />
                            ))}
                          </div>
                        )}
                        <blockquote
                          className="testimonial-quote text-lg sm:text-xl italic mb-6 leading-relaxed"
                          style={{ color: '#14233b' }}
                        >
                          "{testimonial.quote}"
                        </blockquote>
                        <div>
                          <p className="text-lg font-semibold text-gold">
                            {testimonial.name}
                          </p>
                          <p className="text-sm text-gray-400">
                            {testimonial.role}
                          </p>
                          {Number(testimonial.amountReceived) > 0 && (
                            <div className="mt-4 inline-flex flex-col rounded-lg border border-gold/30 bg-gold/10 px-4 py-3">
                              <span className="text-xs uppercase tracking-wide text-gray-300">{amountLabel}</span>
                              <span className="text-xl font-bold text-gold">
                                {new Intl.NumberFormat(amountLocale, { style: 'currency', currency: 'USD' }).format(Number(testimonial.amountReceived))}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Arrow */}
            <button
              onClick={nextTestimonial}
              className="flex-shrink-0 p-3 rounded-full bg-gold/20 hover:bg-gold/40 text-gold transition-all duration-300 transform hover:scale-110"
              aria-label={interfaceText.next}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Indicators */}
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
                aria-label={`Ir para depoimento ${index + 1}`}
              />
            ))}
          </div>
          <div className="text-center mt-10">
            <a href="/avaliar" className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-6 py-3 text-gold hover:bg-gold hover:text-black transition-colors font-semibold">
              <PenLine size={18} />
              {reviewLinkLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
