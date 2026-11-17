import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  type CurrencyCode,
  CURRENCY_CODES,
  CURRENCIES,
  formatCurrencyPrice,
  getExchangeRates,
  getCurrencyDisclaimer,
} from '../lib/currency';
import { useLanguage } from './LanguageContext';

const CURRENCY_STORAGE_KEY = 'allbarka_currency_preference';

export interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  isForeign: boolean;
  rates: Record<CurrencyCode, number>;
  formatPrice: (pkrAmount: number | string | undefined | null, options?: { showApproxSymbol?: boolean }) => string;
  disclaimer: string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (saved && (CURRENCY_CODES as string[]).includes(saved)) {
        return saved as CurrencyCode;
      }
    } catch {
      // Storage unavailable
    }
    return 'PKR';
  });

  const setCurrency = useCallback((newCurrency: CurrencyCode) => {
    if ((CURRENCY_CODES as string[]).includes(newCurrency)) {
      setCurrencyState(newCurrency);
      try {
        localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
      } catch {
        // Storage disabled
      }
    }
  }, []);

  const rates = useMemo(() => getExchangeRates(), []);
  const isForeign = currency !== 'PKR';

  const formatPrice = useCallback(
    (pkrAmount: number | string | undefined | null, options?: { showApproxSymbol?: boolean }) => {
      return formatCurrencyPrice(pkrAmount, currency, options);
    },
    [currency]
  );

  const disclaimer = useMemo(() => getCurrencyDisclaimer(language), [language]);

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      isForeign,
      rates,
      formatPrice,
      disclaimer,
    }),
    [currency, setCurrency, isForeign, rates, formatPrice, disclaimer]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      currency: 'PKR',
      setCurrency: () => {},
      isForeign: false,
      rates: { PKR: 1, USD: 280, GBP: 355, AED: 76.5 },
      formatPrice: (amount) => formatCurrencyPrice(amount, 'PKR'),
      disclaimer: getCurrencyDisclaimer('en'),
    };
  }
  return ctx;
}
