import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, MessageCircle, Calendar } from 'lucide-react';

export function ContactSection() {
  const { t } = useLanguage();

  const phoneNumber = '18574218325';
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=Olá%20Affinity%20Financial!%20Gostaria%20de%20saber%20mais%20sobre%20seus%20serviços.`;
  const calendlyUrl = 'https://calendly.com/affinityfc/consultoria-gratuita';
  const emailUrl = 'mailto:info@affinityfc.org';
  const mapsUrl = 'https://maps.google.com/?q=247+Washington+St,+Stoughton,+MA';

  const contactMethods = [
    {
      icon: Phone,
      label: t('contact.phone'),
      value: t('contact.phone_number'),
      href: 'tel:+18574218325',
    },
    {
      icon: Mail,
      label: t('contact.email'),
      value: t('contact.email_address'),
      href: emailUrl,
    },
    {
      icon: MapPin,
      label: t('contact.address'),
      value: t('contact.address_full'),
      href: mapsUrl,
    },
  ];

  return (
    <section id="contact" className="py-20 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {t('contact.title')}
          </h2>
          <p className="text-xl text-gray-300">
            {t('contact.subtitle')}
          </p>
          <div className="w-20 h-1 bg-gold mx-auto mt-6" />
        </div>

        {/* Contact Methods Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {contactMethods.map((method, index) => {
            const Icon = method.icon;
            return (
              <a
                key={index}
                href={method.href}
                target={method.href.startsWith('http') ? '_blank' : undefined}
                rel={method.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                <Card className="bg-gradient-to-br from-gray-900 to-black border-gold/30 hover:border-gold/60 transition-all duration-300 p-8 h-full hover:shadow-lg hover:shadow-gold/20 cursor-pointer">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gold/20 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-8 h-8 text-gold" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {method.label}
                    </h3>
                    <p className="text-gold font-bold text-lg">
                      {method.value}
                    </p>
                  </div>
                </Card>
              </a>
            );
          })}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a href={calendlyUrl} target="_blank" rel="noopener noreferrer">
            <Button
              size="lg"
              className="bg-gold hover:bg-gold/90 text-black font-bold px-8 py-6 text-lg flex items-center gap-2"
            >
              <Calendar size={20} />
              {t('contact.schedule')}
            </Button>
          </a>

          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <Button
              size="lg"
              variant="outline"
              className="border-gold text-gold hover:bg-gold/10 font-bold px-8 py-6 text-lg flex items-center gap-2"
            >
              <MessageCircle size={20} />
              WhatsApp
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
