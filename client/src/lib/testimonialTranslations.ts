import type { Language } from '@shared/translations';

type TranslatedContent = { role: string; quote: string };

const translations: Record<number, Partial<Record<Exclude<Language, 'pt'>, TranslatedContent>>> = {
  1: {
    en: { role: 'Life Insurance Beneficiary', quote: 'At 21, I was diagnosed with cancer. Thanks to the living benefit, I was able to focus on treatment without financial worries. I am here to share my story and express my gratitude.' },
    es: { role: 'Beneficiaria del Seguro de Vida', quote: 'A los 21 años, recibí un diagnóstico de cáncer. Gracias al beneficio en vida, pude concentrarme en el tratamiento sin preocupaciones financieras. Estoy aquí para contar mi historia y expresar mi gratitud.' },
  },
  30001: {
    en: { role: 'Mother of a Life Insurance Beneficiary', quote: 'I thought I was only planning for my daughter’s future. I never imagined this plan would make such a difference in the present. When she faced cancer at 21, the living benefits provided the financial support she needed during the most difficult time of our lives.' },
    es: { role: 'Madre de una Beneficiaria del Seguro de Vida', quote: 'Pensé que solo estaba planificando el futuro de mi hija. Nunca imaginé que este plan haría tanta diferencia en el presente. Cuando enfrentó un cáncer a los 21 años, los beneficios en vida le brindaron el apoyo financiero que necesitaba durante el momento más difícil de nuestras vidas.' },
  },
  60001: {
    en: { role: 'Life Insurance Beneficiary', quote: 'I thought this insurance would only be useful during retirement or after I passed away. But life changed my plans. When I was diagnosed with cancer, the living benefit supported me exactly when I needed it most.' },
    es: { role: 'Beneficiaria del Seguro de Vida', quote: 'Pensaba que este seguro solo sería útil durante mi jubilación o después de mi fallecimiento. Pero la vida cambió mis planes. Cuando recibí un diagnóstico de cáncer, el beneficio en vida me apoyó exactamente cuando más lo necesitaba.' },
  },
  60003: {
    en: { role: 'Peabody, MA', quote: 'We loved working with Rafael. Bruna’s approach came at exactly the right time because we were already looking for additional protection for our family. Thank you for explaining everything so clearly to us.' },
    es: { role: 'Peabody, MA', quote: 'Nos encantó la atención de Rafael. El acercamiento de Bruna llegó en el momento indicado, porque ya estábamos buscando protección adicional para nuestra familia. Gracias por explicarnos todo con tanta claridad.' },
  },
  60004: {
    en: { role: 'Sudden cardiac arrest', quote: 'Rickson and his wife Bianca share the harrowing story of a sudden and unexplained cardiac arrest that left him in a coma, fighting for his life. His life insurance policy with Living Benefits paid more than $250,000, enabling a remarkable recovery and helping secure a bright and healthy future for Rickson and his wife.' },
    es: { role: 'Paro cardíaco repentino', quote: 'Rickson y su esposa Bianca cuentan la angustiante historia de un paro cardíaco repentino e inexplicable que lo dejó en coma, luchando por su vida. Su póliza de seguro de vida con Beneficios en Vida pagó más de $250,000, lo que permitió una recuperación extraordinaria y ayudó a asegurar un futuro saludable y prometedor para Rickson y su esposa.' },
  },
};

export function localizeTestimonial<T extends { id: number; language?: string; role: string; quote: string }>(item: T, language: Language): T {
  if (language === 'pt' || item.language === language) return item;
  const translated = translations[Number(item.id)]?.[language];
  return translated ? { ...item, ...translated } : item;
}
