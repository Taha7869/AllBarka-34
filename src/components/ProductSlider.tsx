import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import ProductCard from './ProductCard';
import { Product } from '../types';
import { PRODUCTS } from '../data/products';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

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
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { align: 'start', containScroll: 'trimSnaps', dragFree: true },
    [Autoplay({ delay: 6000, stopOnInteraction: true, stopOnMouseEnter: true })]
  );
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

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

          <div className="hidden flex items-center gap-3 self-end sm:flex">
            <Link
              to="/shop"
              className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-[var(--color-gold)] hover:text-[var(--color-emerald)] transition-colors mr-2"
            >
              <span>View All ({PRODUCTS.length})</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Sliding Products Row inside Embla Wrapper */}
        <div className="group relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex touch-pan-y backface-hidden" style={{ touchAction: 'pan-y pinch-zoom' }}>
              {products.map((product) => (
                <div
                  key={product.id}
                  className="min-w-0 flex-none pl-4 sm:pl-6 first:pl-0 w-[calc(100%/1.15)] sm:w-[calc(100%/2.5)] lg:w-[calc(100%/4)] h-full transition-opacity duration-300"
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
          </div>
          
          {/* Edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[var(--color-surface)] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--color-surface)] to-transparent" />

          {/* Custom Nav Arrows (visible on hover for desktop) */}
          <button
            type="button"
            onClick={scrollPrev}
            className={`absolute z-10 left-[-20px] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-[var(--color-gold)]/40 bg-[var(--color-surface)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-[var(--color-surface)] items-center justify-center transition-all duration-300 cursor-pointer shadow-md opacity-0 hidden sm:flex group-hover:opacity-100 ${!canScrollPrev ? 'hidden sm:hidden pointer-events-none' : ''}`}
            aria-label="Previous Products"
          >
            <ChevronLeft size={22} className="ml-[-1px]" />
          </button>
          
          <button
            type="button"
            onClick={scrollNext}
            className={`absolute z-10 right-[-20px] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-[var(--color-gold)]/40 bg-[var(--color-surface)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-[var(--color-surface)] items-center justify-center transition-all duration-300 cursor-pointer shadow-md opacity-0 hidden sm:flex group-hover:opacity-100 ${!canScrollNext ? 'hidden sm:hidden pointer-events-none' : ''}`}
            aria-label="Next Products"
          >
            <ChevronRight size={22} className="mr-[-1px]" />
          </button>
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
