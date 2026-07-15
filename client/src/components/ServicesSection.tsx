import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Heart, TrendingUp, Zap } from 'lucide-react';

export function ServicesSection() {
  const { t } = useLanguage();

  const services = [
    {
      icon: Heart,
      title: t('services.life_insurance.title'),
      description: t('services.life_insurance.description'),
    },
    {
      icon: TrendingUp,
      title: t('services.pension.title'),
      description: t('services.pension.description'),
    },
    {
      icon: Zap,
      title: t('services.living_benefits.title'),
      description: t('services.living_benefits.description'),
    },
  ];

  return (
    <section id="services" className="py-20 bg-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {t('services.title')}
          </h2>
          <p className="text-xl text-gray-300">
            {t('services.subtitle')}
          </p>
          <div className="w-20 h-1 bg-gold mx-auto mt-6" />
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card
                key={index}
                className="bg-gradient-to-br from-gray-900 to-black border-gold/30 hover:border-gold/60 transition-all duration-300 hover:shadow-lg hover:shadow-gold/20 p-8"
              >
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gold/20 rounded-lg flex items-center justify-center">
                    <Icon className="w-8 h-8 text-gold" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-4">
                  {service.title}
                </h3>

                <p className="text-gray-300 leading-relaxed">
                  {service.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
