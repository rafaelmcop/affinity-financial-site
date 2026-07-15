import { useEffect, useState } from 'react';
import type { Language } from '@shared/translations';
import { translations } from '@shared/translations';

export function useLanguage() {
  const [language, setLanguage] = useState<Language>('pt');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load language from localStorage on mount
    const savedLanguage = localStorage.getItem('affinity-language') as Language | null;
    if (savedLanguage && (savedLanguage === 'pt' || savedLanguage === 'en' || savedLanguage === 'es')) {
      setLanguage(savedLanguage);
    }
    setIsLoaded(true);
  }, []);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('affinity-language', lang);
  };

  const t = (path: string): string => {
    const keys = path.split('.');
    let value: any = translations[language];

    for (const key of keys) {
      value = value?.[key];
    }

    return value || path;
  };

  return {
    language,
    changeLanguage,
    t,
    isLoaded,
  };
}
