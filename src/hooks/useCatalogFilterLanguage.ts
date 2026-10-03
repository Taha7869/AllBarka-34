import { useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { catalogFilterTranslations } from '../contexts/catalogFilterTranslations';

/** This small dictionary stays with the lazy catalogue instead of the shared header. */
export function useCatalogFilterLanguage() {
  const context = useLanguage();
  const { language, t: storefrontTranslation } = context;
  const t = useCallback((key: string, fallback = '') => (
    catalogFilterTranslations[language]?.[key] || storefrontTranslation(key, fallback)
  ), [language, storefrontTranslation]);
  return { ...context, t };
}
