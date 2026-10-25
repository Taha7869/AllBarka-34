import { useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { visualRefinementTranslations } from '../contexts/visualRefinementTranslations';

export function useVisualRefinementLanguage() {
  const context = useLanguage();
  const { language, t: storefrontTranslation } = context;
  const t = useCallback((key: string, fallback = '') => (
    visualRefinementTranslations[language]?.[key] || storefrontTranslation(key, fallback)
  ), [language, storefrontTranslation]);
  return { ...context, t };
}
