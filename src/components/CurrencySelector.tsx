import React from 'react';
import { useLocation } from 'react-router-dom';
import { Coins, ChevronDown } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import { CURRENCY_CODES, CURRENCIES, type CurrencyCode } from '../lib/currency';
import { useLanguage } from '../contexts/LanguageContext';

interface CurrencySelectorProps {
  variant?: 'desktop' | 'mobile';
  className?: string;
}

export default function CurrencySelector({ variant = 'desktop', className = '' }: CurrencySelectorProps) {
  const { currency, setCurrency, isForeign, disclaimer } = useCurrency();
  const { t, isRtl } = useLanguage();

  let isReveal = false;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const location = useLocation();
    isReveal = location.pathname.startsWith('/reveal');
  } catch {
    // Outside router context in tests
  }

  if (isReveal) {
    return null;
  }

  if (variant === 'mobile') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-[#E4C783]">
            {t('currencySelector', 'Currency / کرنسی / العملة')}
          </span>
          {isForeign && (
            <span className="text-[10px] text-[#F2ECE2]/75 italic">
              {t('currency.approxNotice', '≈ Display only, pay in PKR')}
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#031F1A] border border-[#C7982F]/25">
          {CURRENCY_CODES.map((code) => {
            const isSelected = currency === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setCurrency(code)}
                aria-pressed={isSelected}
                className={`min-h-[44px] py-2 px-1 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer ${
                  isSelected
                    ? 'bg-[#C7982F] text-[#042821] shadow-xs'
                    : 'text-[#F2ECE2]/80 hover:text-[#FDFBF7]'
                }`}
              >
                {code}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop Header Variant
  return (
    <div
      className={`relative hidden md:flex items-center min-h-[42px] rounded-xl border border-[#29231D]/10 dark:border-[#C7982F]/25 bg-[#F6F1EA]/60 dark:bg-[#1A201E]/60 text-[#042821] dark:text-[#FFFCF7] focus-within:ring-2 focus-within:ring-[#C7982F]/35 ${className}`}
      title={isForeign ? disclaimer : undefined}
    >
      <Coins size={15} className="absolute start-2.5 text-[#C7982F] pointer-events-none" aria-hidden="true" />
      <label htmlFor="desktop-currency-select" className="sr-only">
        {t('currencySelector', 'Currency')}
      </label>
      <select
        id="desktop-currency-select"
        value={currency}
        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
        className="h-[40px] w-[100px] appearance-none cursor-pointer rounded-xl bg-transparent ps-8 pe-6 text-xs font-semibold focus:outline-none"
        aria-label={t('currencySelector', 'Currency')}
      >
        {CURRENCY_CODES.map((code) => (
          <option key={code} value={code} className="bg-[#FFFCF7] dark:bg-[#1A201E] text-[#042821] dark:text-[#FAF9F5]">
            {CURRENCIES[code].label}
          </option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute end-2 text-[#C7982F] pointer-events-none" aria-hidden="true" />
    </div>
  );
}
