import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';

export function TestimonialsSection() {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [videoThumbnails, setVideoThumbnails] = useState<Record<number, string>>({});
  const [loadedThumbnails, setLoadedThumbnails] = useState<Set<number>>(new Set());

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

  // Extract thumbnail from video
  const extractVideoThumbnail = (videoUrl: string, index: number, onComplete?: () => void) => {
    const video = document.createElement('video');
    video.src = encodeURI(videoUrl);
    video.crossOrigin = 'anonymous';
    video.currentTime = 1; // Get frame at 1 second

    video.onloadedmetadata = () => {
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
      }
      if (onComplete) onComplete();
    };

    video.onerror = () => {
      console.log('Não foi possível extrair thumbnail do vídeo:', videoUrl);
      if (onComplete) onComplete();
    };
  };

  useEffect(() => {
    if (testimonialsQuery.data) {
      setIsLoading(true);
      setIsLoadingThumbnails(true);
      
      // Filter by current language
      const currentLang = localStorage.getItem('language') || 'pt';
      const filtered = testimonialsQuery.data.filter((t: any) => t.language === currentLang);
      
      // If no testimonials for current language, show Portuguese ones
      const toShow = filtered.length > 0 ? filtered : testimonialsQuery.data.filter((t: any) => t.language === 'pt');
      
      // Shuffle testimonials for random display
      const shuffled = shuffleArray(toShow);
      setTestimonials(shuffled);
      
      // Extract thumbnails for video testimonials
      const videoCount = shuffled.filter((t: any) => t.mediaType === 'video' && t.mediaUrl).length;
      let thumbnailsLoaded = 0;
      
      shuffled.forEach((testimonial, index) => {
        if (testimonial.mediaType === 'video' && testimonial.mediaUrl) {
          extractVideoThumbnail(testimonial.mediaUrl, index, () => {
            thumbnailsLoaded++;
            if (thumbnailsLoaded === videoCount) {
              setIsLoadingThumbnails(false);
            }
          });
        }
      });
      
      if (videoCount === 0) {
        setIsLoadingThumbnails(false);
      }
      
      // Simulate minimum loading time for smooth animation
      setTimeout(() => {
        setIsLoading(false);
        setShowLoadingOverlay(false);
      }, 500);
    }
  }, [testimonialsQuery.data]);

  // Intersection Observer to pause video when out of view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (!entry.isIntersecting && videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
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

  // Pause video when changing testimonial
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
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

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if ((videoRef.current as any).webkitRequestFullscreen) {
        (videoRef.current as any).webkitRequestFullscreen();
      } else if ((videoRef.current as any).mozRequestFullScreen) {
        (videoRef.current as any).mozRequestFullScreen();
      } else if ((videoRef.current as any).msRequestFullscreen) {
        (videoRef.current as any).msRequestFullscreen();
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
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
              <p className="text-gray-400 text-sm">Carregando depoimentos...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const currentTestimonial = testimonials[currentIndex];
  const currentThumbnail = videoThumbnails[currentIndex];
  const isThumbnailLoading = currentTestimonial?.mediaType === 'video' && !currentThumbnail && !loadedThumbnails.has(currentIndex);

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
              aria-label="Depoimento anterior"
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
                        
                        {testimonial.mediaType === 'video' && testimonial.mediaUrl ? (
                          <div className={`relative transition-opacity duration-500 ${isThumbnailLoading ? 'opacity-50' : 'opacity-100'}`}>
                            <video
                              ref={index === currentIndex ? videoRef : null}
                              controls
                              className="w-full h-64 object-cover rounded-lg border-2 border-gold/30 bg-black"
                              poster={currentThumbnail || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23000%22 width=%22100%22 height=%22100%22/%3E%3Cpolygon fill=%22%23d4af37%22 points=%2235,25 35,75 75,50%22/%3E%3C/svg%3E'}
                              controlsList="nodownload"
                              onError={(e) => {
                                console.error('Erro ao carregar vídeo:', testimonial.mediaUrl, e);
                              }}
                            >
                              <source src={encodeURI(testimonial.mediaUrl)} type="video/mp4" />
                              <source src={encodeURI(testimonial.mediaUrl.replace(/\.mp4$/i, '.webm'))} type="video/webm" />
                              <source src={encodeURI(testimonial.mediaUrl.replace(/\.mp4$/i, '.ogv'))} type="video/ogg" />
                              Seu navegador não suporta a tag de vídeo. Por favor, atualize seu navegador.
                            </video>
                            
                            {/* Fullscreen Button */}
                            <button
                              onClick={toggleFullscreen}
                              className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-gold/70 text-gold rounded-lg transition-all duration-300 opacity-0 group-hover:opacity-100"
                              title="Tela inteira"
                            >
                              <Maximize2 size={20} />
                            </button>
                          </div>
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
                        <blockquote className="text-lg sm:text-xl text-gray-100 italic mb-6 leading-relaxed">
                          "{testimonial.quote}"
                        </blockquote>
                        <div>
                          <p className="text-lg font-semibold text-gold">
                            {testimonial.name}
                          </p>
                          <p className="text-sm text-gray-400">
                            {testimonial.role}
                          </p>
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
              aria-label="Próximo depoimento"
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
        </div>
      </div>
    </section>
  );
}
