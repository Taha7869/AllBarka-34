import React from 'react';
import { Info } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Owner rule (16 Nov): bid-box rates are shown so customers get an idea, but they are not final.
 * After an order or quote request the team confirms the final price and details.
 */
export default function IndicativePriceNotice({ className = '' }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <aside data-indicative-price-notice role="note" className={`flex gap-3 rounded-2xl border border-[#D4AF6A]/45 bg-[#FAF6EE] px-4 py-3 text-[#3D3427] dark:bg-[#1C2422] dark:text-[#EDE4D3] ${className}`}>
      <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[#8C6B1B]" />
      <div className="min-w-0">
        <p className="text-sm font-semibold" dir="auto">{t('bidBox.priceNotice.title')}</p>
        <p className="mt-1 text-xs leading-5" dir="auto">{t('bidBox.priceNotice.body')}</p>
      </div>
    </aside>
  );
}
