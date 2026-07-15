import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import type { Language } from '@shared/translations';

export function LanguageSelector() {
  const { language, changeLanguage, t } = useLanguage();

  const languages: { code: Language; label: string }[] = [
    { code: 'pt', label: t('general.portuguese') },
    { code: 'en', label: t('general.english') },
    { code: 'es', label: t('general.spanish') },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-gold hover:text-gold/80"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline text-xs font-semibold uppercase">
            {language}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-black border-gold">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`cursor-pointer ${
              language === lang.code
                ? 'bg-gold/20 text-gold font-semibold'
                : 'text-white hover:bg-gold/10 hover:text-gold'
            }`}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
