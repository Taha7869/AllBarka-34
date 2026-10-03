import { useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { productMediaTranslations } from '../contexts/productMediaTranslations';

export function useProductMediaLanguage() {
  const context = useLanguage();
  const { language, t: fallbackTranslation } = context;
  const t = useCallback((key: string, fallback = '') => productMediaTranslations[language]?.[key] || fallbackTranslation(key, fallback), [language, fallbackTranslation]);
  return { ...context, t };
}
