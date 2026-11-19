import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../lib/apiUrl';
import {
  CONSENT_POLICY_VERSION,
  CONSENT_STORAGE_KEY,
  defaultConsentCategories,
  generateAnonymousConsentId,
  hasEffectiveConsent,
  isGpcEnabled,
  needsConsentPrompt,
  parseStoredConsent,
  readStoredConsent,
  writeStoredConsent,
  type ConsentCategories,
  type ConsentCategory,
  type ConsentRecord,
} from '../lib/consent';

export interface ConsentContextValue {
  consent: ConsentRecord | null;
  categories: ConsentCategories;
  hasConsented: boolean;
  needsPrompt: boolean;
  gpcEnabled: boolean;
  policyVersion: string;
  isPreferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (prefs: { analytics: boolean; marketing: boolean }) => void;
  hasCategoryConsent: (category: ConsentCategory) => boolean;
}

const noop = () => {};

const FALLBACK_CONTEXT: ConsentContextValue = {
  consent: null,
  categories: defaultConsentCategories(),
  hasConsented: false,
  needsPrompt: false,
  gpcEnabled: false,
  policyVersion: CONSENT_POLICY_VERSION,
  isPreferencesOpen: false,
  openPreferences: noop,
  closePreferences: noop,
  acceptAll: noop,
  rejectAll: noop,
  savePreferences: noop,
  hasCategoryConsent: (category) => category === 'necessary',
};

const ConsentContext = createContext<ConsentContextValue>(FALLBACK_CONTEXT);

async function sendConsentLog(record: ConsentRecord, gpc: boolean): Promise<void> {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  try {
    await fetch(apiUrl('/api/consent'), {
      method: 'POST',
      keepalive: true,
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anonymousId: record.anonymousId,
        categories: record.categories,
        policyVersion: record.policyVersion,
        timestamp: record.updatedAt,
        gpc,
      }),
    });
  } catch {
    // Server audit log is best-effort and never blocks browsing or local choice persistence.
  }
}

export interface ConsentProviderProps {
  children: React.ReactNode;
  policyVersion?: string;
  initialGpc?: boolean;
  logConsent?: (record: ConsentRecord, gpc: boolean) => void | Promise<void>;
}

export function ConsentProvider({
  children,
  policyVersion = CONSENT_POLICY_VERSION,
  initialGpc,
  logConsent = sendConsentLog,
}: ConsentProviderProps) {
  const [gpcEnabled] = useState<boolean>(() =>
    initialGpc !== undefined ? initialGpc : isGpcEnabled()
  );
  const [consent, setConsent] = useState<ConsentRecord | null>(() => readStoredConsent());
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  // Keep multiple browser tabs synchronized if preferences change in another tab
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === CONSENT_STORAGE_KEY) {
        setConsent(parseStoredConsent(event.newValue));
      }
    };
    const onOpenEvent = () => setIsPreferencesOpen(true);
    window.addEventListener('storage', onStorage);
    window.addEventListener('allbarka:open-cookie-settings', onOpenEvent);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('allbarka:open-cookie-settings', onOpenEvent);
    };
  }, []);

  const persistChoice = useCallback(
    (next: { analytics: boolean; marketing: boolean }) => {
      const anonymousId = consent?.anonymousId || generateAnonymousConsentId();
      const record: ConsentRecord = {
        anonymousId,
        categories: {
          necessary: true,
          analytics: Boolean(next.analytics),
          marketing: Boolean(next.marketing),
        },
        policyVersion,
        updatedAt: new Date().toISOString(),
        gpcRespected: gpcEnabled,
      };
      writeStoredConsent(record);
      setConsent(record);
      setIsPreferencesOpen(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('allbarka:consent-changed', { detail: record }));
      }
      void logConsent(record, gpcEnabled);
    },
    [consent?.anonymousId, gpcEnabled, logConsent, policyVersion]
  );

  const acceptAll = useCallback(() => {
    persistChoice({ analytics: true, marketing: true });
  }, [persistChoice]);

  const rejectAll = useCallback(() => {
    persistChoice({ analytics: false, marketing: false });
  }, [persistChoice]);

  const savePreferences = useCallback(
    (prefs: { analytics: boolean; marketing: boolean }) => {
      persistChoice(prefs);
    },
    [persistChoice]
  );

  const openPreferences = useCallback(() => setIsPreferencesOpen(true), []);
  const closePreferences = useCallback(() => setIsPreferencesOpen(false), []);

  const promptRequired = needsConsentPrompt(consent, policyVersion);

  const categories: ConsentCategories = useMemo(() => {
    if (!consent || consent.policyVersion !== policyVersion) {
      return defaultConsentCategories();
    }
    return consent.categories;
  }, [consent, policyVersion]);

  const hasCategoryConsent = useCallback(
    (category: ConsentCategory) =>
      hasEffectiveConsent(consent, category, { currentVersion: policyVersion, gpcEnabled }),
    [consent, gpcEnabled, policyVersion]
  );

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      categories,
      hasConsented: !promptRequired,
      needsPrompt: promptRequired,
      gpcEnabled,
      policyVersion,
      isPreferencesOpen,
      openPreferences,
      closePreferences,
      acceptAll,
      rejectAll,
      savePreferences,
      hasCategoryConsent,
    }),
    [
      acceptAll,
      categories,
      closePreferences,
      consent,
      gpcEnabled,
      hasCategoryConsent,
      isPreferencesOpen,
      openPreferences,
      policyVersion,
      promptRequired,
      rejectAll,
      savePreferences,
    ]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  return useContext(ConsentContext);
}
