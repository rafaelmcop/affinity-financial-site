import { Navigation } from '@/components/Navigation';
import { HeroSection } from '@/components/HeroSection';
import { ServicesSection } from '@/components/ServicesSection';
import { TestimonialsSection } from '@/components/TestimonialsSection';
import { AboutSection } from '@/components/AboutSection';
import { ContactSection } from '@/components/ContactSection';
import { Footer } from '@/components/Footer';
import { FloatingWhatsApp } from '@/components/FloatingWhatsApp';
import { ReviewsBanner } from '@/components/ReviewsBanner';
import { PortalAccessSection } from '@/components/PortalAccessSection';

export default function Home() {
  return (
    <div className="public-light min-h-screen bg-black text-white">
      <Navigation />
      <HeroSection />
      <ServicesSection />
      <TestimonialsSection />
      <AboutSection />
      <ReviewsBanner />
      <ContactSection />
      <PortalAccessSection />
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
