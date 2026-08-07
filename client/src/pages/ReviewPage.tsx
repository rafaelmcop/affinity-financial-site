import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { ReviewSubmissionSection } from '@/components/ReviewSubmissionSection';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Footer } from '@/components/Footer';
import { FloatingWhatsApp } from '@/components/FloatingWhatsApp';
import { useLanguage } from '@/contexts/LanguageContext';

const copy = {
  pt: { back: 'Voltar ao site', note: 'Página segura para clientes da Affinity Financial' },
  en: { back: 'Back to website', note: 'Secure page for Affinity Financial clients' },
  es: { back: 'Volver al sitio', note: 'Página segura para clientes de Affinity Financial' },
};

export default function ReviewPage() {
  const { language } = useLanguage();
  const text = copy[language];
  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <header className="border-b border-gold/20 bg-black/95">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3 text-gold hover:opacity-80 transition-opacity">
            <ArrowLeft size={20} /><span className="hidden sm:inline text-sm font-semibold">{text.back}</span>
          </a>
          <a href="/" className="text-center leading-tight">
            <div className="text-gold font-bold text-lg">Affinity Financial</div>
            <div className="text-gold/75 text-xs">Consulting Inc.</div>
          </a>
          <LanguageSelector />
        </div>
      </header>
      <div className="pt-8 text-center px-4">
        <div className="inline-flex items-center gap-2 text-xs text-gray-400 border border-white/10 bg-white/5 rounded-full px-4 py-2">
          <LockKeyhole size={14} className="text-gold" />{text.note}
        </div>
      </div>
      <ReviewSubmissionSection />
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
