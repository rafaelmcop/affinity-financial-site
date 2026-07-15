import { MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function FloatingWhatsApp() {
  const { language } = useLanguage();
  const phoneNumber = '18574218325';
  
  const whatsappMessages = {
    pt: 'Olá Affinity Financial! Gostaria de saber mais sobre seus serviços.',
    en: 'Hello Affinity Financial! I would like to know more about your services.',
    es: '¡Hola Affinity Financial! Me gustaría saber más sobre sus servicios.'
  };
  
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessages[language])}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
      aria-label="Contact us on WhatsApp"
    >
      <MessageCircle size={28} />
    </a>
  );
}
