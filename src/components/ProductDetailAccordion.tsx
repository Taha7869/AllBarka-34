import React, { useEffect, useId, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { AlertCircle, ChevronDown, Leaf, PackageCheck, ThermometerSnowflake } from 'lucide-react';
import type { Product } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { getLocalized } from '../utils/localize';

interface ProductDetailAccordionProps {
  product: Product;
  theme?: 'dark' | 'light';
  className?: string;
  defaultOpenKey?: string;
}

export default function ProductDetailAccordion({ product, className = '', defaultOpenKey = 'storage' }: ProductDetailAccordionProps) {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const accordionId = useId();
  const [openSection, setOpenSection] = useState<string | null>(defaultOpenKey);

  useEffect(() => { setOpenSection(defaultOpenKey); }, [product.id, defaultOpenKey]);

  const origin = getLocalized(product, 'origin', language);
  const harvest = getLocalized(product, 'harvest', language);
  const sourcing = getLocalized(product, 'sourcingDetails', language) || t('care.sourcingFallback', 'Source details are not listed for this selection. Ask our team for more information.');
  const storage = getLocalized(product, 'storageTips', language) || t('care.storageFallback', 'Follow the storage guidance on the product label and keep the packaging closed between uses.');
  const packaging = getLocalized(product, 'packagingDetails', language) || t('care.packagingFallback', 'Packaging varies by selection. Ask our team for the available options.');
  const suggestedUse = getLocalized(product, 'recipe', language) || t('care.useFallback', 'Follow the product label for serving and use instructions.');
  const allergens = getLocalized(product, 'allergenWarning', language) || t('care.allergenFallback', 'Allergen details are not listed for this selection. If you have an allergy, contact our team before ordering.');

  const sections = [
    {
      key: 'storage', Icon: ThermometerSnowflake, title: t('care.storage', 'Use & storage'),
      content: <div className="space-y-4">
        <div>
          <p dir="auto" className="mb-1 text-start text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent-text)]">{t('care.use', 'Suggested use')}</p>
          <p dir="auto" className="text-start">{suggestedUse}</p>
        </div>
        <div>
          <p dir="auto" className="mb-1 text-start text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent-text)]">{t('care.storageLabel', 'Storage guidance')}</p>
          <p dir="auto" className="text-start">{storage}</p>
        </div>
      </div>,
    },
    {
      key: 'sourcing', Icon: Leaf, title: t('care.sourcing', 'Details & sourcing'),
      content: <div className="space-y-3">
        <p dir="auto" className="text-start">{sourcing}</p>
        {(origin || harvest) && <dl className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] p-3 sm:grid-cols-2">
          {origin && <div className="min-w-0">
            <dt dir="auto" className="mb-1 text-start text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent-text)]">{t('shop.origin')}</dt>
            <dd dir="auto" className="text-start leading-5 text-[var(--color-text-primary)]">{origin}</dd>
          </div>}
          {harvest && <div className="min-w-0">
            <dt dir="auto" className="mb-1 text-start text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent-text)]">{t('care.harvest', 'Harvest information')}</dt>
            <dd dir="auto" className="text-start leading-5 text-[var(--color-text-primary)]">{harvest}</dd>
          </div>}
        </dl>}
      </div>,
    },
    { key: 'packaging', Icon: PackageCheck, title: t('care.packaging', 'Packaging details'), content: <p dir="auto" className="text-start">{packaging}</p> },
    { key: 'allergens', Icon: AlertCircle, title: t('care.allergens', 'Allergen information'), content: <p dir="auto" className="text-start">{allergens}</p> },
  ];

  return <div dir="ltr" className={`w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs ${className}`}>
    <p dir="auto" className="border-b border-[var(--color-border)] bg-[var(--color-base)] px-4 py-3 text-start text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent-text)]">
      {t('care.title', 'Product care & details')}
    </p>
    <div className="divide-y divide-[var(--color-border)]">
      {sections.map(({ key, Icon, title, content }) => {
        const isOpen = openSection === key;
        const panelId = `${accordionId}-${key}`;
        const buttonId = `${panelId}-button`;
        return <div key={key}>
          <button type="button" id={buttonId} aria-expanded={isOpen} aria-controls={panelId}
            onClick={() => setOpenSection(previous => previous === key ? null : key)}
            className={`focus-ring flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3 text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-base)] ${isOpen ? 'bg-[var(--color-base)]' : ''}`}>
            <span className="flex min-w-0 items-center gap-3">
              <Icon size={17} aria-hidden="true" className="shrink-0 text-[var(--color-accent-text)]" />
              <span dir="auto" className="text-start font-serif text-sm font-semibold">{title}</span>
            </span>
            <motion.span aria-hidden="true" animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: reduceMotion ? 0 : .2 }} className="shrink-0 text-[var(--color-accent-text)]">
              <ChevronDown size={17} />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {isOpen && <motion.div key={panelId} id={panelId} role="region" aria-labelledby={buttonId}
              initial={reduceMotion ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .22 }} className="overflow-hidden">
              <div className="px-4 pb-5 pt-2 text-xs leading-6 text-[var(--color-text-secondary)]">{content}</div>
            </motion.div>}
          </AnimatePresence>
        </div>;
      })}
    </div>
  </div>;
}
