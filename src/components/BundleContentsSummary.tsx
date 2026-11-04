import type { Product } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { readBundleFormat } from '../lib/merchandisingPresentation';
import { getLocalized } from '../utils/localize';

const pending = {
  en: 'Selections confirmed before dispatch.',
  ur: 'اشیاء کی حتمی تصدیق روانگی سے پہلے ہوگی۔',
  ar: 'تُؤكَّد الأصناف قبل الإرسال.',
};
export default function BundleContentsSummary({ product }: { product: Product }) {
  const { language, t } = useLanguage();
  const catalog = useCatalogProducts();
  const format = readBundleFormat(product);
  if (!format) return null;
  const ids = product.componentIds || [];
  const components = ids.map(id => catalog.find(item => item.id === id));
  const exact = ids.length === format.count && components.every(Boolean);
  return <div data-bundle-summary={product.id} className="my-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] p-3 text-start text-xs leading-relaxed text-[var(--color-text-primary)]" dir={language === 'en' ? 'ltr' : 'rtl'}>
    <p className="font-semibold">{t('packContents')} · <bdi dir="ltr">{format.label}</bdi> · <bdi dir="ltr">{`${format.netGrams}g`}</bdi></p>
    <p className="mt-1">{exact ? components.map(item => `${getLocalized(item!, 'name', language)} (${format.gramsEach}g)`).join(' · ') : pending[language]}</p>
  </div>;
}
