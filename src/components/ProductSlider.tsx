import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { Product } from '../types';
import { PRODUCTS } from '../data/products';
import CircularCarousel from './CircularCarousel';
import { circularCatalogue } from '../lib/circularCatalogue';
import { useLanguage } from '../contexts/LanguageContext';

interface ProductSliderProps {
  title?: string;
  subtitle?: string;
  products: Product[];
  onAddToCart: (productId: string, weight: string) => void;
  onQuickView: (product: Product) => void;
}

export default function ProductSlider({
  title = 'Boutique Bestsellers',
  subtitle = 'Hand-sorted premium harvest lots, freshly packed for Lahore doorstep delivery.',
  products, onAddToCart, onQuickView,
}: ProductSliderProps) {
  const { t } = useLanguage();
  const catalogue = useMemo(() => circularCatalogue(products, PRODUCTS), [products]);

  return (
    <section dir="ltr" className="boutique-bestsellers w-full py-12 sm:py-16 lg:py-20 bg-[var(--color-surface)] border-y border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-7 sm:mb-9 text-left">
          <div>
            <div className="inline-flex items-center gap-2.5 text-[var(--color-accent-text)] text-[10px] font-semibold uppercase tracking-[.22em] mb-3">
              <Sparkles size={11} /><span dir="auto">{t('slider.curated')}</span>
            </div>
            <h2 dir="auto" className="text-3xl sm:text-4xl lg:text-[44px] font-serif font-medium leading-tight tracking-[-.025em] text-[var(--color-ink)]">
              {title === 'Boutique Bestsellers' ? t('slider.title') : title}
            </h2>
            <p dir="auto" className="text-sm text-[var(--color-text-secondary)] mt-3 max-w-lg leading-7 font-normal">
              {title === 'Boutique Bestsellers' ? t('slider.subtitle') : subtitle}
            </p>
          </div>
          <Link to="/shop" className="focus-ring hidden min-h-11 items-center gap-3 self-end border-b border-[var(--color-gold)]/40 text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--color-accent-text)] hover:text-[var(--color-ink)] transition-colors motion-reduce:transition-none sm:inline-flex">
            <span dir="auto">{t('slider.viewAll')} ({catalogue.length})</span><ArrowRight size={13} />
          </Link>
        </div>

        <CircularCarousel products={catalogue} onAddToCart={onAddToCart} onQuickView={onQuickView} />

        <div className="mt-5 text-center sm:hidden">
          <Link to="/shop" className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-base)] px-6 text-[11px] font-semibold uppercase tracking-[.1em] text-[var(--color-ink)]">
            <span dir="auto">{t('slider.viewAll')} ({catalogue.length})</span><ArrowRight size={13} className="ml-1.5 text-[var(--color-gold)]" />
          </Link>
        </div>
      </div>
    </section>
  );
}
