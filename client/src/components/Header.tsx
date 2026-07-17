import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  userType?: 'admin' | 'affiliate';
}

export default function Header({ 
  title, 
  showBackButton = true, 
  showHomeButton = true,
  userType = 'affiliate'
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
    setLocation('/');
  };

  return (
    <header className="bg-black border-b border-gold/20 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="text-gold font-bold text-xl">
              Affinity Financial
            </div>
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
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            )}

            {showBackButton && (
              <Button
                onClick={handleBack}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-gold/30 text-gold hover:bg-gold/10"
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
