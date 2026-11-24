import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { WifiOff, RefreshCw, ShoppingBag, ArrowRight } from 'lucide-react';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useCatalogActivity } from '../hooks/useCatalogActivity';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useCurrency } from '../contexts/CurrencyContext';
import { getLocalized } from '../utils/localize';
import { getProductImage } from '../data/products';

interface OfflineCopy {
  eyebrow: string;
  heading: string;
  body: string;
  onlineNow: string;
  retry: string;
  openBag: string;
  recentHeading: string;
  recentFallbackHeading: string;
  viewProduct: string;
}

const COPY: Record<LanguageCode, OfflineCopy> = {
  en: {
    eyebrow: 'Offline Mode',
    heading: 'You are currently offline',
    body: 'Check your internet connection and tap retry. Your shopping bag and previously viewed products remain saved on this device.',
    onlineNow: 'Connection restored — tap retry to load live prices and stock.',
    retry: 'Try again',
    openBag: 'Open bag',
    recentHeading: 'Previously viewed products',
    recentFallbackHeading: 'Saved boutique selections',
    viewProduct: 'View',
  },
  ur: {
    eyebrow: 'آف لائن موڈ',
    heading: 'اس وقت انٹرنیٹ دستیاب نہیں',
    body: 'براہِ کرم انٹرنیٹ کنکشن چیک کر کے دوبارہ کوشش کریں۔ آپ کا شاپنگ بیگ اور پچھلی دیکھی گئی مصنوعات اس ڈیوائس پر محفوظ ہیں۔',
    onlineNow: 'انٹرنیٹ بحال ہو گیا ہے — تازہ قیمتیں اور اسٹاک دیکھنے کے لیے دوبارہ لوڈ کریں۔',
    retry: 'دوبارہ کوشش کریں',
    openBag: 'بیگ کھولیں',
    recentHeading: 'پچھلی دیکھی گئی مصنوعات',
    recentFallbackHeading: 'محفوظ بوتیک مصنوعات',
    viewProduct: 'دیکھیں',
  },
  ar: {
    eyebrow: 'وضع عدم الاتصال',
    heading: 'أنت غير متصل بالإنترنت حاليًا',
    body: 'تحقق من اتصال الإنترنت ثم أعد المحاولة. تبقى حقيبة التسوق والمنتجات التي شاهدتها مؤخرًا محفوظة على هذا الجهاز.',
    onlineNow: 'عاد الاتصال — اضغط لإعادة تحميل الأسعار والمخزون المباشر.',
    retry: 'إعادة المحاولة',
    openBag: 'افتح الحقيبة',
    recentHeading: 'المنتجات المشاهدة مؤخرًا',
    recentFallbackHeading: 'مختارات البوتيك المحفوظة',
    viewProduct: 'عرض',
  },
};

export interface OfflinePageProps {
  /** Optional override for testing offline view deterministically. */
  recentOverrideIds?: string[];
}

export default function OfflinePage({ recentOverrideIds }: OfflinePageProps) {
  const { language, isRtl } = useLanguage();
  const online = useOnlineStatus();
  const products = useCatalogProducts();
  const { recentIds } = useCatalogActivity();
  const { formatPrice } = useCurrency();
  const words = COPY[language] || COPY.en;
  const dir = isRtl ? 'rtl' : 'ltr';

  const activeRecentIds = recentOverrideIds ?? recentIds;

  const { displayedProducts, isFallback } = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    const matched = activeRecentIds
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p && p.active !== false));
    if (matched.length > 0) {
      return { displayedProducts: matched.slice(0, 8), isFallback: false };
    }
    return {
      displayedProducts: products.filter((p) => p.active !== false).slice(0, 4),
      isFallback: true,
    };
  }, [activeRecentIds, products]);

  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <section
      dir={dir}
      data-offline-page
      className="w-full min-h-[70vh] bg-[var(--color-base,#F6F1EA)] px-4 py-10 sm:px-6 sm:py-14 dark:bg-[#101614]"
    >
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="rounded-3xl border border-[#C7982F]/35 bg-[var(--color-surface,#FFFCF7)] p-6 text-center shadow-sm sm:p-10 dark:bg-[#161E1C] dark:border-[#C7982F]/30">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#C7982F]/35 bg-[#1E3A2B]/10 text-[#1E3A2B] dark:bg-[#C7982F]/15 dark:text-[#D8B25C]">
            <WifiOff size={26} aria-hidden="true" />
          </div>
          <p className="text-[11px] font-bold text-[#806326] dark:text-[#D8B25C]">
            {words.eyebrow}
          </p>
          <h1 className="mt-2 font-serif text-2xl font-bold text-[#1E3A2B] sm:text-3xl dark:text-[#FAF9F5]">
            {words.heading}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#29231D]/85 dark:text-[#D4CEC2]">
            {online ? words.onlineNow : words.body}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              data-offline-retry
              onClick={handleRetry}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#1E3A2B] px-6 py-2.5 text-xs font-bold text-[#FAF9F5] transition-colors hover:bg-[#152B1F] dark:bg-[#C7982F] dark:text-[#111917] dark:hover:bg-[#D6A942] focus-ring cursor-pointer"
            >
              <RefreshCw size={15} aria-hidden="true" />
              <span>{words.retry}</span>
            </button>
            <Link
              to="/cart"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[#1E3A2B]/35 bg-[var(--color-base,#F6F1EA)] px-6 py-2.5 text-xs font-bold text-[#1E3A2B] transition-colors hover:border-[#C7982F] dark:border-[#C7982F]/45 dark:bg-[#1E2724] dark:text-[#FAF9F5] focus-ring"
            >
              <ShoppingBag size={15} aria-hidden="true" />
              <span>{words.openBag}</span>
            </Link>
          </div>
        </div>

        {/* Previously Viewed (or Saved Fallback) Products */}
        <div data-offline-recent-section className="space-y-4 text-start">
          <h2 className="font-serif text-lg font-bold text-[#1E3A2B] sm:text-xl dark:text-[#FAF9F5]">
            {isFallback ? words.recentFallbackHeading : words.recentHeading}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {displayedProducts.map((product) => {
              const name = getLocalized(product, 'name', language);
              const priceValues = Object.values(product.prices || {}).filter(
                (v): v is number => typeof v === 'number' && v > 0
              );
              const minPrice = priceValues.length ? Math.min(...priceValues) : 0;
              return (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  data-offline-product={product.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#C7982F]/25 bg-[var(--color-surface,#FFFCF7)] transition-colors hover:border-[#C7982F] dark:bg-[#17201D] focus-ring"
                >
                  <div className="aspect-square w-full overflow-hidden bg-[#ECE5D9] dark:bg-[#1E2724]">
                    <img
                      src={getProductImage(product)}
                      alt={name}
                      width={320}
                      height={320}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between gap-2 p-3">
                    <h3 className="line-clamp-2 font-serif text-xs font-bold text-[#1E3A2B] sm:text-sm dark:text-[#FAF9F5]">
                      {name}
                    </h3>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#806326] dark:text-[#D8B25C]">
                        {minPrice > 0 ? formatPrice(minPrice) : words.viewProduct}
                      </span>
                      <ArrowRight
                        size={14}
                        className={`text-[#1E3A2B]/60 dark:text-[#D8B25C] ${isRtl ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
