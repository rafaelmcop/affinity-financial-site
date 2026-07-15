import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

export function HeroSection() {
  const { t } = useLanguage();
  const phoneNumber = '18574218325';
  
  const whatsappMessages = {
    pt: 'Olá Affinity Financial! Gostaria de saber mais sobre seus serviços.',
    en: 'Hello Affinity Financial! I would like to know more about your services.',
    es: '¡Hola Affinity Financial! Me gustaría saber más sobre sus servicios.'
  };
  
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessages[t('general.portuguese') === 'Português' ? 'pt' : t('general.english') === 'English' ? 'en' : 'es'])}`;
  const calendlyUrl = 'https://calendly.com/affinityfc/consultoria-gratuita';

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32"
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/manus-storage/family_1_605f6631.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          {t('hero.headline')}
        </h1>

        <p className="text-lg sm:text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
          {t('hero.subheadline')}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a href={calendlyUrl} target="_blank" rel="noopener noreferrer">
            <Button
              size="lg"
              className="bg-gold hover:bg-gold/90 text-black font-bold px-8 py-6 text-lg"
            >
              {t('hero.cta_calendar')}
            </Button>
          </a>

          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <Button
              size="lg"
              variant="outline"
              className="border-gold text-gold hover:bg-gold/10 font-bold px-8 py-6 text-lg flex items-center gap-2"
            >
              <MessageCircle size={20} />
              {t('hero.cta_whatsapp')}
            </Button>
          </a>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
        <div className="text-gold text-center">
          <svg
            className="w-6 h-6 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
