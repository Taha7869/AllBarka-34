import { useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { circularCarouselTranslations, type CircularCarouselTranslationKey } from '../contexts/circularCarouselTranslations';

export function useCircularCarouselLanguage() {
  const context = useLanguage();
  const { language, t: storefrontTranslation } = context;
  const t = useCallback((key: string, fallback = '') => (
    circularCarouselTranslations[language]?.[key as CircularCarouselTranslationKey] || storefrontTranslation(key, fallback)
  ), [language, storefrontTranslation]);
  return { ...context, t };
}
