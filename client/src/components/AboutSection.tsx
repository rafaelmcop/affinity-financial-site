import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export function AboutSection() {
  const { t } = useLanguage();

  return (
    <section id="about" className="py-20 bg-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {t('about.title')}
          </h2>
          <p className="text-xl text-gold font-semibold">
            {t('about.subtitle')}
          </p>
          <div className="w-20 h-1 bg-gold mx-auto mt-6" />
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Mission */}
          <Card className="bg-gradient-to-br from-gray-900 to-black border-gold/30 p-8">
            <div className="flex items-start gap-4 mb-4">
              <CheckCircle className="w-8 h-8 text-gold flex-shrink-0 mt-1" />
              <h3 className="text-2xl font-bold text-white">
                {t('about.mission')}
              </h3>
            </div>
            <p className="text-gray-300 leading-relaxed">
              {t('about.mission_text')}
            </p>
          </Card>

          {/* Values */}
          <Card className="bg-gradient-to-br from-gray-900 to-black border-gold/30 p-8">
            <div className="flex items-start gap-4 mb-4">
              <CheckCircle className="w-8 h-8 text-gold flex-shrink-0 mt-1" />
              <h3 className="text-2xl font-bold text-white">
                {t('about.values')}
              </h3>
            </div>
            <p className="text-gray-300 leading-relaxed">
              {t('about.values_text')}
            </p>
          </Card>

          {/* Difference */}
          <Card className="bg-gradient-to-br from-gray-900 to-black border-gold/30 p-8">
            <div className="flex items-start gap-4 mb-4">
              <CheckCircle className="w-8 h-8 text-gold flex-shrink-0 mt-1" />
              <h3 className="text-2xl font-bold text-white">
                {t('about.difference')}
              </h3>
            </div>
            <p className="text-gray-300 leading-relaxed">
              {t('about.difference_text')}
            </p>
          </Card>
        </div>

        {/* Hero Image */}
        <div className="mt-12">
          <img
            src="/manus-storage/consulting_6e3f2f09.png"
            alt="Affinity Financial Consulting"
            className="w-full h-96 object-cover rounded-lg border-2 border-gold/30 shadow-lg shadow-gold/20"
          />
        </div>
      </div>
    </section>
  );
}
