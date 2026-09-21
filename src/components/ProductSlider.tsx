import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import ProductCard from './ProductCard';
import { Product } from '../types';
import { PRODUCTS } from '../data/products';
import { useDragScroll } from '../hooks/useDragScroll';

interface ProductSliderProps {
  title?: string;
  subtitle?: string;
  products: Product[];
  onAddToCart: (productId: string, weight: string) => void;
  onQuickView: (product: Product) => void;
}

export default function ProductSlider({
  title = "Boutique Bestsellers",
  subtitle = "Hand-sorted premium harvest lots, freshly packed for Lahore doorstep delivery.",
  products,
  onAddToCart,
  onQuickView
}: ProductSliderProps) {
  const scrollRef = useDragScroll<HTMLDivElement>();

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full py-16 bg-[var(--color-surface)] border-y border-[var(--color-border)] select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 text-left">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-base)] border border-[var(--color-gold)]/30 text-[var(--color-gold)] text-[10px] font-black uppercase tracking-widest mb-2">
              <Sparkles size={11} />
              <span>Curated Selection</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black text-[var(--color-ink)]">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] mt-1 max-w-lg leading-relaxed font-normal">
              {subtitle}
            </p>
          </div>

          {/* Controls + Link */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Link
              to="/shop"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-[var(--color-gold)] hover:text-[var(--color-emerald)] transition-colors mr-2"
            >
              <span>View All ({PRODUCTS.length})</span>
              <ArrowRight size={13} />
            </Link>

            <button
              type="button"
              onClick={() => scroll('left')}
              className="w-10 h-10 rounded-full border border-[var(--color-border)] bg-[var(--color-base)] text-[var(--color-ink)] hover:bg-[var(--color-emerald)] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              aria-label="Previous Product"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="w-10 h-10 rounded-full border border-[var(--color-border)] bg-[var(--color-base)] text-[var(--color-ink)] hover:bg-[var(--color-emerald)] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              aria-label="Next Product"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Sliding Products Row (Only 6 to 8 items, cleanly spaced) */}
        <div
          ref={scrollRef}
          className="flex gap-5 sm:gap-6 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth cursor-grab active:cursor-grabbing select-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.slice(0, 8).map((product) => (
            <div
              key={product.id}
              className="snap-start shrink-0 w-[270px] sm:w-[300px] h-full"
            >
              <ProductCard
                product={product}
                isWholesale={false}
                onAddToCart={onAddToCart}
                onQuickView={onQuickView}
                viewMode="grid"
              />
            </div>
          ))}
        </div>

        {/* Mobile View All Button */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            to="/shop"
            className="inline-flex items-center justify-center w-full py-3 rounded-full bg-[var(--color-base)] border border-[var(--color-border)] text-xs font-black uppercase tracking-widest text-[var(--color-ink)]"
          >
            <span>View All Products ({PRODUCTS.length})</span>
            <ArrowRight size={13} className="ml-1.5 text-[var(--color-gold)]" />
          </Link>
        </div>

      </div>
    </section>
  );
}
