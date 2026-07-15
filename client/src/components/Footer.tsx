import { useLanguage } from '@/contexts/LanguageContext';
import { Logo } from './Logo';
import { Instagram, Phone, Mail, MapPin } from 'lucide-react';

export function Footer() {
  const { t } = useLanguage();

  const navItems = [
    { label: t('nav.home'), id: 'home' },
    { label: t('nav.services'), id: 'services' },
    { label: t('nav.about'), id: 'about' },
    { label: t('nav.testimonials'), id: 'testimonials' },
    { label: t('nav.contact'), id: 'contact' },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-black border-t border-gold/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div>
            <Logo size="medium" />
            <p className="text-gray-400 text-sm leading-relaxed mt-4">
              {t('footer.company_name')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">
              {t('footer.quick_links')}
            </h4>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => scrollToSection(item.id)}
                    className="text-gray-400 hover:text-gold transition-colors text-sm"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-4">
              {t('contact.title')}
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-gray-400 hover:text-gold transition-colors">
                <Phone size={16} />
                <a href="tel:+18574218325">(857) 421-8325</a>
              </li>
              <li className="flex items-center gap-2 text-gray-400 hover:text-gold transition-colors">
                <Mail size={16} />
                <a href="mailto:info@affinityfc.org">info@affinityfc.org</a>
              </li>
              <li className="flex items-start gap-2 text-gray-400">
                <MapPin size={16} className="mt-1 flex-shrink-0" />
                <span>247 Washington St, Stoughton, MA</span>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="text-white font-semibold mb-4">
              {t('footer.follow_us')}
            </h4>
            <a
              href="https://instagram.com/affinity.fc"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gold/20 hover:bg-gold/30 text-gold px-4 py-2 rounded-lg transition-colors"
            >
              <Instagram size={20} />
              @affinity.fc
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gold/20 pt-8">
          <p className="text-center text-gray-500 text-sm">
            {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
