import { formatPKR } from './pricing';
import type { LanguageCode } from '../contexts/LanguageContext';

export type CurrencyCode = 'PKR' | 'GBP' | 'USD' | 'AED';

export const CURRENCY_CODES: CurrencyCode[] = ['PKR', 'GBP', 'USD', 'AED'];

export interface CurrencyMetadata {
  code: CurrencyCode;
  label: string;
  symbol: string;
  prefix: boolean;
  defaultPkrRate: number; // 1 unit of foreign currency = X PKR
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMetadata> = {
  PKR: {
    code: 'PKR',
    label: 'PKR',
    symbol: 'Rs.',
    prefix: true,
    defaultPkrRate: 1.0,
  },
  GBP: {
    code: 'GBP',
    label: 'GBP (£)',
    symbol: '£',
    prefix: true,
    defaultPkrRate: 355.0,
  },
  USD: {
    code: 'USD',
    label: 'USD ($)',
    symbol: '$',
    prefix: true,
    defaultPkrRate: 280.0,
  },
  AED: {
    code: 'AED',
    label: 'AED (د.إ)',
    symbol: 'AED',
    prefix: true,
    defaultPkrRate: 76.5,
  },
};

/**
 * Reads static exchange rates from environment variables or hardcoded defaults.
 * STRICT RULE: Never calls any live external exchange rate API.
 */
export function getExchangeRates(): Record<CurrencyCode, number> {
  const getEnvRate = (key: string, defaultVal: number): number => {
    try {
      const val = typeof process !== 'undefined' ? process.env?.[key] : undefined;
      const num = Number(val);
      return Number.isFinite(num) && num > 0 ? num : defaultVal;
    } catch {
      return defaultVal;
    }
  };

  return {
    PKR: 1.0,
    USD: getEnvRate('VITE_EXCHANGE_RATE_USD', CURRENCIES.USD.defaultPkrRate),
    GBP: getEnvRate('VITE_EXCHANGE_RATE_GBP', CURRENCIES.GBP.defaultPkrRate),
    AED: getEnvRate('VITE_EXCHANGE_RATE_AED', CURRENCIES.AED.defaultPkrRate),
  };
}

/**
 * Converts a PKR amount to the target currency.
 */
export function convertPkrToForeign(pkrAmount: number, targetCurrency: CurrencyCode): number {
  if (!Number.isFinite(pkrAmount) || pkrAmount <= 0) return 0;
  if (targetCurrency === 'PKR') return pkrAmount;

  const rates = getExchangeRates();
  const rate = rates[targetCurrency] || CURRENCIES[targetCurrency]?.defaultPkrRate || 1;
  return Number((pkrAmount / rate).toFixed(2));
}

/**
 * Formats a PKR price according to the selected currency.
 * For foreign currencies, always prepends the approximation symbol "≈".
 * Checkout and order totals always remain in canonical PKR.
 */
export function formatCurrencyPrice(
  pkrAmount: number | string | undefined | null,
  currency: CurrencyCode,
  options?: { showApproxSymbol?: boolean }
): string {
  const cleanPkr = typeof pkrAmount === 'number' ? pkrAmount : Number(pkrAmount) || 0;
  if (cleanPkr < 0 || !Number.isFinite(cleanPkr)) return formatPKR(0);

  if (currency === 'PKR') {
    return formatPKR(cleanPkr);
  }

  const meta = CURRENCIES[currency] || CURRENCIES.USD;
  const converted = convertPkrToForeign(cleanPkr, currency);
  const approx = options?.showApproxSymbol !== false ? '≈ ' : '';

  const formattedNum = converted.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return meta.prefix
    ? `${approx}${meta.symbol} ${formattedNum}`
    : `${approx}${formattedNum} ${meta.symbol}`;
}

/**
 * Clean localized disclosure notices.
 */
export function getCurrencyDisclaimer(language: LanguageCode): string {
  switch (language) {
    case 'ur':
      return 'صرف اندازاً قیمت۔ تمام آرڈرز اور پیمنٹ صرف پاکستانی روپے (PKR) میں ہو گی۔';
    case 'ar':
      return 'عرض تقديري فقط. تتم جميع عمليات الدفع والطلبات بالروبية الباكستانية (PKR) حصراً.';
    case 'en':
    default:
      return 'Approximate display only. Payment is strictly processed in Pakistani Rupees (PKR).';
  }
}
