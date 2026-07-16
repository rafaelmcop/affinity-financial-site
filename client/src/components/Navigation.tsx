import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from './LanguageSelector';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navigation() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setIsOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navItems = [
    { label: t('nav.home'), id: 'home' },
    { label: t('nav.services'), id: 'services' },
    { label: t('nav.about'), id: 'about' },
    { label: t('nav.testimonials'), id: 'testimonials' },
    { label: t('nav.contact'), id: 'contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-black/95 backdrop-blur-sm border-b border-gold/20 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="#home" className="hover:opacity-80 transition-opacity">
              <div className="text-lg font-bold text-gold whitespace-nowrap leading-tight">
                <div>Affinity Financial</div>
                <div className="text-xs text-gold/80">Consulting Inc.</div>
              </div>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-white hover:text-gold transition-colors text-sm font-medium"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right Side - Language Selector + Mobile Menu */}
          <div className="flex items-center gap-4">
            <a
              href="/afiliados"
              className="hidden sm:block text-white hover:text-gold transition-colors text-sm font-medium"
            >
              Afiliados
            </a>
            <LanguageSelector />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden text-gold hover:text-gold/80"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2 border-t border-gold/20 mt-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="block w-full text-left px-4 py-2 text-white hover:bg-gold/10 hover:text-gold transition-colors text-sm font-medium"
              >
                {item.label}
              </button>
            ))}
            <a
              href="/afiliados"
              className="block w-full text-left px-4 py-2 text-white hover:bg-gold/10 hover:text-gold transition-colors text-sm font-medium"
            >
              Afiliados
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
