import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  userType?: 'admin' | 'affiliate';
  showLogo?: boolean;
  logoUrl?: string;
}

export default function Header({ 
  title, 
  showBackButton = true, 
  showHomeButton = true,
  userType = 'affiliate',
  showLogo = false,
  logoUrl
}: HeaderProps) {
  const [location, setLocation] = useLocation();

  const handleBack = () => {
    window.history.back();
  };

  const handleHome = () => {
    if (userType === 'admin') {
      setLocation('/admin/dashboard');
    } else {
      setLocation('/afiliados/dashboard');
    }
  };

  const handleLogoClick = () => {
    if (userType === 'admin') {
      setLocation('/admin/dashboard');
    } else if (userType === 'affiliate') {
      setLocation('/afiliados/dashboard');
    } else {
      setLocation('/');
    }
  };

  return (
    <header className="bg-black border-b border-gold/20 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Panel Title - Stacked Layout */}
          <button
            onClick={handleLogoClick}
            className="flex flex-col items-start hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-2">
              {showLogo && logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Affinity Financial"
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <div className="text-gold font-bold text-lg">
                  Affinity Financial
                </div>
              )}
            </div>
            {userType === 'admin' && (
              <span className="text-xs text-gold/70 font-semibold mt-1">
                Painel do Administrador
              </span>
            )}
            {userType === 'affiliate' && (
              <span className="text-xs text-gold/70 font-semibold mt-1">
                Painel de Afiliados
              </span>
            )}
          </button>

          {/* Title (center) */}
          {title && (
            <h1 className="text-lg font-semibold text-gold">{title}</h1>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center gap-3">
            {showHomeButton && (
              <Button
                onClick={handleHome}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-gold/30 text-gold hover:bg-gold/10"
              >
                <Home size={18} />
                <span className="hidden sm:inline">Painel</span>
              </Button>
            )}

            {showBackButton && (
              <Button
                onClick={handleBack}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-gold/30 text-gold hover:bg-gold/10"
                title="Voltar para página anterior"
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
