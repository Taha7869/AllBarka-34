import { useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { adminTranslations } from '../contexts/adminTranslations';

/** Keep the operations dictionary in the lazy admin route instead of the storefront bundle. */
export function useAdminLanguage() {
  const context = useLanguage();
  const { language, t: storefrontTranslation } = context;
  const t = useCallback((key: string, fallback = '') => (
    adminTranslations[language]?.[key] || storefrontTranslation(key, fallback)
  ), [language, storefrontTranslation]);
  return { ...context, t };
}
