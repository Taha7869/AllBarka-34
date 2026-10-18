import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { MerchandisingSettings } from '../types';
import { DEFAULT_MERCHANDISING } from '../config/merchandising';
import { apiUrl } from '../lib/apiUrl';

interface MerchandisingContextValue {
  settings: MerchandisingSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const MerchandisingContext = createContext<MerchandisingContextValue>({
  settings: DEFAULT_MERCHANDISING,
  loading: false,
  refresh: async () => {},
});

export function MerchandisingProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: MerchandisingSettings;
}) {
  const [settings, setSettings] = useState<MerchandisingSettings>(
    initialSettings || DEFAULT_MERCHANDISING
  );
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(apiUrl('/api/merchandising'), {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.settings && Array.isArray(data.settings.showcaseTabs)) {
          setSettings(data.settings);
        }
      }
    } catch {
      // Fallback remains existing/default settings
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__refreshMerchandising = refresh;
    }
    if (initialSettings) {
      setSettings(initialSettings);
      return;
    }
    void refresh();
  }, [initialSettings, refresh]);

  return (
    <MerchandisingContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </MerchandisingContext.Provider>
  );
}

export const useMerchandisingSettings = () => useContext(MerchandisingContext).settings;
export const useMerchandisingRefresh = () => useContext(MerchandisingContext).refresh;
