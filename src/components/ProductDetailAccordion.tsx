import { usePrefersReducedMotion as useReducedMotion } from '../hooks/usePrefersReducedMotion';
import React, { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ChevronDown, FileText, HelpCircle, Leaf, PackageCheck, ThermometerSnowflake, ShieldCheck, Award } from 'lucide-react';
import type { Product } from '../types';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { getLocalized } from '../utils/localize';
import { readBundleFormat } from '../lib/merchandisingPresentation';

interface ProductDetailAccordionProps {
  product: Product;
  theme?: 'dark' | 'light';
  className?: string;
  defaultOpenKey?: string;
  includeOverviewAndFaq?: boolean;
  isPackaging?: boolean;
}

const PDP_FAQ_COPY: Record<
  LanguageCode,
  {
    overviewTitle: string;
    packagingOverviewTitle: string;
    faqTitle: string;
    fullFaqLink: string;
    items: Array<{ q: string; a: string }>;
  }
> = {
  en: {
    overviewTitle: 'Description & taste profile',
    packagingOverviewTitle: 'Description & details',
    faqTitle: 'Delivery & ordering FAQ',
    fullFaqLink: 'View all frequently asked questions',
    items: [
      {
        q: 'How is delivery handled?',
        a: 'Same-day options in Lahore and tracked courier dispatch across Pakistan. Standard delivery is free from Rs. 3,000.',
      },
      {
        q: 'How are dry fruits packed for freshness?',
        a: 'Every lot is graded and sealed fresh to order in food-grade barrier pouches or rigid gift boxes in Lahore.',
      },
      {
        q: 'Can I add a gift card or order custom quantities?',
        a: 'Yes — add a printed gift message in the bag or request a tailored quote for events and corporate gifting.',
      },
    ],
  },
  ur: {
    overviewTitle: 'تفصیل اور ذائقہ',
    packagingOverviewTitle: 'تفصیلات',
    faqTitle: 'ترسیل اور آرڈر کے سوالات',
    fullFaqLink: 'تمام عمومی سوالات دیکھیں',
    items: [
      {
        q: 'ڈلیوری کیسے ہوتی ہے؟',
        a: 'لاہور میں سیم ڈے آپشن اور پاکستان بھر میں ٹریکڈ کوریئر سروس دستیاب ہے۔ Rs. 3,000 سے اوپر معیاری ڈلیوری مفت ہے۔',
      },
      {
        q: 'تازگی کے لیے پیکنگ کیسی ہوتی ہے؟',
        a: 'ہر آرڈر لاہور میں تازہ چھانٹ کر فوڈ گریڈ ایئر ٹائٹ پاؤچز یا مضبوط گفٹ باکس میں سیل کیا جاتا ہے۔',
      },
      {
        q: 'کیا گفٹ کارڈ یا زیادہ مقدار کے لیے آرڈر ہو سکتا ہے؟',
        a: 'جی ہاں — بیگ میں پرنٹڈ گفٹ پیغام شامل کریں یا تقاریب اور کارپوریٹ تحائف کے لیے کسٹم کوٹ حاصل کریں۔',
      },
    ],
  },
  ar: {
    overviewTitle: 'الوصف ونكهة المنتج',
    packagingOverviewTitle: 'الوصف والتفاصيل',
    faqTitle: 'أسئلة التوصيل والطلب',
    fullFaqLink: 'عرض جميع الأسئلة الشائعة',
    items: [
      {
        q: 'كيف يتم التوصيل؟',
        a: 'خيارات توصيل في نفس اليوم داخل لاهور وشحن متابع إلى مختلف مدن باكستان، مع توصيل قياسي مجاني للطلبات من 3,000 روبية.',
      },
      {
        q: 'كيف تُحفظ طزاجة المنتج أثناء التعبئة؟',
        a: 'تُفرز كل دفعة وتُختم طازجة عند الطلب في عبوات محكمة آمنة للغذاء أو صناديق هدايا متينة في لاهور.',
      },
      {
        q: 'هل يمكن إضافة بطاقة إهداء أو طلب كميات مخصصة؟',
        a: 'نعم — يمكنك إضافة رسالة إهداء مطبوعة من الحقيبة أو طلب عرض سعر مخصص للمناسبات وهدايا الشركات.',
      },
    ],
  },
};

function readIsMobileAccordionViewport(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(max-width: 767px)').matches
    : false;
}

export default function ProductDetailAccordion({
  product,
  className = '',
  defaultOpenKey = 'storage',
  includeOverviewAndFaq = false,
  isPackaging = false,
}: ProductDetailAccordionProps) {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const accordionId = useId();
  const resolvedDefaultKey = includeOverviewAndFaq && readIsMobileAccordionViewport() ? 'overview' : defaultOpenKey;
  const [openSection, setOpenSection] = useState<string | null>(resolvedDefaultKey);

  useEffect(() => {
    setOpenSection(includeOverviewAndFaq && readIsMobileAccordionViewport() ? 'overview' : defaultOpenKey);
  }, [product.id, defaultOpenKey, includeOverviewAndFaq]);

  const origin = getLocalized(product, 'origin', language);
  const harvest = product.passport?.harvestSeason || getLocalized(product, 'harvest', language);
  const sourcing = getLocalized(product, 'sourcingDetails', language) || t('care.sourcingFallback', 'Source details are not listed for this selection. Ask our team for more information.');
  const storage = getLocalized(product, 'storageTips', language) || t('care.storageFallback', 'Follow the storage guidance on the product label and keep the packaging closed between uses.');
  const packaging = getLocalized(product, 'packagingDetails', language) || t('care.packagingFallback', 'Packaging varies by selection. Ask our team for the available options.');
  const suggestedUse = getLocalized(product, 'recipe', language) || t('care.useFallback', 'Follow the product label for serving and use instructions.');
  const allergens = getLocalized(product, 'allergenWarning', language) || t('care.allergenFallback', 'Allergen details are not listed for this selection. If you have an allergy, contact our team before ordering.');
  const description = getLocalized(product, 'desc', language);
  const tasteProfile = !isPackaging ? getLocalized(product, 'tasteProfile', language) : '';
  const packContents = !readBundleFormat(product) ? getLocalized(product, 'contents', language) : '';
  const faqCopy = PDP_FAQ_COPY[language] || PDP_FAQ_COPY.en;

  const passport = product.passport;
  const claims = product.claimsVerification;
  const isClaimsVerified = claims?.status === 'verified';
  const verifiedCertifications = isClaimsVerified ? (passport?.certifications || []) : [];

  const sections: Array<{
    key: string;
    Icon: typeof ThermometerSnowflake;
    title: string;
    mobileOnly?: boolean;
    content: React.ReactNode;
  }> = [
    ...(includeOverviewAndFaq ? [{
      key: 'overview',
      Icon: FileText,
      title: isPackaging ? faqCopy.packagingOverviewTitle : faqCopy.overviewTitle,
      mobileOnly: true,
      content: <div className="space-y-3">
        {description && <p dir="auto" className="whitespace-pre-line text-start leading-relaxed text-[var(--color-text-secondary)]">{description}</p>}
        {tasteProfile && <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] p-3">
          <p dir="auto" className="mb-1 text-start text-[11px] font-semibold text-[var(--color-accent-text)]">{t('tasteProfile')}</p>
          <p dir="auto" className="text-start text-[var(--color-text-primary)]">{tasteProfile}</p>
        </div>}
        {packContents && <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] p-3">
          <p dir="auto" className="mb-1 text-start text-[11px] font-semibold text-[var(--color-accent-text)]">{t('packContents')}</p>
          <p dir="auto" className="text-start text-[var(--color-text-primary)]">{packContents}</p>
        </div>}
      </div>,
    }] : []),
    {
      key: 'storage', Icon: ThermometerSnowflake, title: t('care.storage', 'Use & storage'),
      content: <div className="space-y-4">
        <div>
          <p dir="auto" className="mb-1 text-start text-[11px] font-semibold text-[var(--color-accent-text)]">{t('care.use', 'Suggested use')}</p>
          <p dir="auto" className="text-start">{suggestedUse}</p>
        </div>
        <div>
          <p dir="auto" className="mb-1 text-start text-[11px] font-semibold text-[var(--color-accent-text)]">{t('care.storageLabel', 'Storage guidance')}</p>
          <p dir="auto" className="text-start">{passport?.storageInstructions || storage}</p>
        </div>
        {passport?.bestBeforeDays !== undefined && <div>
          <p dir="auto" className="mb-1 text-start text-[11px] font-semibold text-[var(--color-accent-text)]">{t('care.shelfLife', 'Best before / Shelf life')}</p>
          <p dir="auto" className="text-start leading-5">{passport.bestBeforeDays} {t('care.days', 'days from packaging')}</p>
        </div>}
      </div>,
    },
    {
      key: 'sourcing', Icon: Leaf, title: t('care.sourcing', 'Details & sourcing'),
      content: <div className="space-y-3">
        <p dir="auto" className="text-start">{sourcing}</p>
        {(origin || harvest || passport?.variety || passport?.roastLevel || passport?.processingMethod) && <dl className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] p-3 sm:grid-cols-2">
          {passport?.variety && <div className="min-w-0">
            <dt dir="auto" className="mb-1 text-start text-[11px] font-semibold text-[var(--color-accent-text)]">{t('item.variety', 'Variety')}</dt>
            <dd dir="auto" className="text-start leading-5 text-[var(--color-text-primary)]">{passport.variety}</dd>
          </div>}
          {passport?.roastLevel && <div className="min-w-0">
            <dt dir="auto" className="mb-1 text-start text-[11px] font-semibold text-[var(--color-accent-text)]">{t('item.roastLevel', 'Roast level')}</dt>
            <dd dir="auto" className="text-start leading-5 text-[var(--color-text-primary)]">{t('item.roast.' + passport.roastLevel, passport.roastLevel.replace('_', ' '))}</dd>
          </div>}
          {passport?.processingMethod && <div className="min-w-0">
            <dt dir="auto" className="mb-1 text-start text-[11px] font-semibold text-[var(--color-accent-text)]">{t('item.processingMethod', 'Processing')}</dt>
            <dd dir="auto" className="text-start leading-5 text-[var(--color-text-primary)]">{passport.processingMethod}</dd>
          </div>}
          {origin && <div className="min-w-0">
            <dt dir="auto" className="mb-1 text-start text-[11px] font-semibold text-[var(--color-accent-text)]">{t('shop.origin')}</dt>
            <dd dir="auto" className="text-start leading-5 text-[var(--color-text-primary)]">{origin}</dd>
          </div>}
          {harvest && <div className="min-w-0">
            <dt dir="auto" className="mb-1 text-start text-[11px] font-semibold text-[var(--color-accent-text)]">{t('care.harvest', 'Harvest information')}</dt>
            <dd dir="auto" className="text-start leading-5 text-[var(--color-text-primary)]">{harvest}</dd>
          </div>}
        </dl>}
      </div>,
    },
    { key: 'packaging', Icon: PackageCheck, title: t('care.packaging', 'Packaging details'), content: <p dir="auto" className="text-start">{packaging}</p> },
    { key: 'allergens', Icon: AlertCircle, title: t('care.allergens', 'Allergen information'), content: <div className="space-y-3">
      <p dir="auto" className="text-start">{allergens}</p>
      {!!passport?.allergens?.length && <div>
        <p dir="auto" className="mb-1 text-start text-[11px] font-semibold text-[var(--color-accent-text)]">{t('care.containsAllergens', 'Contains / Advisory')}</p>
        <div className="flex flex-wrap gap-1.5">{passport.allergens.map((a, i) => <span key={i} className="rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-primary)]">{a}</span>)}</div>
      </div>}
      {!!passport?.ingredients?.length && <div>
        <p dir="auto" className="mb-1 text-start text-[11px] font-semibold text-[var(--color-accent-text)]">{t('item.ingredients', 'Ingredients')}</p>
        <p dir="auto" className="text-start leading-5 text-[var(--color-text-primary)]">{passport.ingredients.join(', ')}</p>
      </div>}
    </div> },
    ...(verifiedCertifications.length > 0 || isClaimsVerified ? [{
      key: 'passport', Icon: ShieldCheck, title: t('care.passport', 'Verified Passport & Quality'), content: <div className="space-y-3">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
          <ShieldCheck size={16} />
          <span className="font-semibold text-xs">{t('care.verifiedClaims', 'AllBarka Verified Quality')}</span>
          {claims?.verifiedAt && <span className="text-[10px] opacity-75">· {claims.verifiedAt}</span>}
        </div>
        {verifiedCertifications.length > 0 && <div className="flex flex-wrap gap-2 pt-1">
          {verifiedCertifications.map(cert => (
            <span key={cert} className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-accent)] bg-[var(--color-base)] px-3 py-1 text-[11px] font-medium text-[var(--color-accent-text)]">
              <Award size={13} /> {t('item.cert.' + cert, cert.replace('_', ' '))}
            </span>
          ))}
        </div>}
      </div>
    }] : []),
    ...(includeOverviewAndFaq ? [{
      key: 'faq',
      Icon: HelpCircle,
      title: faqCopy.faqTitle,
      content: <div className="space-y-3">
        {faqCopy.items.map(item => (
          <div key={item.q} className="space-y-0.5">
            <p dir="auto" className="text-start text-xs font-semibold text-[var(--color-text-primary)]">{item.q}</p>
            <p dir="auto" className="text-start text-xs leading-relaxed text-[var(--color-text-secondary)]">{item.a}</p>
          </div>
        ))}
        <Link to="/faq" className="focus-ring inline-flex min-h-[44px] items-center text-xs font-semibold text-[var(--color-accent-text)] underline underline-offset-4">
          <span dir="auto">{faqCopy.fullFaqLink}</span>
        </Link>
      </div>,
    }] : []),
  ];

  return <div dir="ltr" data-testid="pdp-detail-accordion" className={`w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs ${className}`}>
    <p dir="auto" className="border-b border-[var(--color-border)] bg-[var(--color-base)] px-4 py-3 text-start text-xs font-medium text-[var(--color-accent-text)]">
      {t('care.title', 'Product care & details')}
    </p>
    <div className="divide-y divide-[var(--color-border)]">
      {sections.map(({ key, Icon, title, mobileOnly, content }) => {
        const isOpen = openSection === key;
        const panelId = `${accordionId}-${key}`;
        const buttonId = `${panelId}-button`;
        return <div key={key} data-accordion-key={key} className={mobileOnly ? 'md:hidden' : undefined}>
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
              <div className="px-4 pb-4 pt-2 text-xs leading-6 text-[var(--color-text-secondary)]">{content}</div>
            </motion.div>}
          </AnimatePresence>
        </div>;
      })}
    </div>
  </div>;
}
