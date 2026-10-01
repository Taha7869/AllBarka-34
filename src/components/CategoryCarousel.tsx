import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

const categories = [
  { id: 'all', name: 'All Items', luxuryName: 'Full Boutique', eyebrow: 'Full boutique', image: '/assets/categories/all_items.png', altKey: 'imageAlt.hero', link: '/shop', featured: true },
  { id: 'deals', name: 'Deals & Bundles', luxuryName: 'Deals & Bundles', eyebrow: 'Better together', image: '/assets/categories/deals.png', altKey: 'imageAlt.categoryDealBoxes', link: '/shop/combos' },
  { id: 'nuts', name: 'Dry Fruits & Nuts', luxuryName: 'Dry Fruits', eyebrow: 'Hand-graded', image: '/assets/categories/dry_fruits.png', altKey: 'imageAlt.categoryDryFruits', link: '/shop/nuts' },
  { id: 'snacks-seeds', name: 'Snacks & Seeds', luxuryName: 'Snacks', eyebrow: 'Everyday pantry', image: '/assets/categories/snacks.png', altKey: 'imageAlt.categorySnacks', link: '/shop/snacks-seeds' },
  { id: 'gift-boxes', name: 'Gift Boxes', luxuryName: 'Gift Boxes', eyebrow: 'Made for giving', image: '/assets/categories/gifts.png', altKey: 'imageAlt.categoryGifts', link: '/gifting' },
  { id: 'oils', name: 'Cold-Pressed Oils', luxuryName: 'Cold-Pressed Oils', eyebrow: 'Pure extraction', image: '/images/generated/category-oils-tile-v1.webp', altKey: 'imageAlt.categoryOils', link: '/shop/oils' },
  { id: 'essentials', name: 'Desi Essentials', luxuryName: 'Desi Essentials', eyebrow: 'From the pantry', image: '/images/generated/category-essentials-tile-v1.webp', altKey: 'imageAlt.categoryEssentials', link: '/shop/essentials' },
];

export default function CategoryCarousel() {
  const { t } = useLanguage();
  const isReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { align: 'start', containScroll: 'trimSnaps', dragFree: true },
    isReducedMotion ? [] : [Autoplay({ delay: 5000, stopOnInteraction: true, playOnInit: false, stopOnMouseEnter: true })]
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollNext();
    }
  };

  return (
    <section dir="ltr" className="w-full border-b border-[var(--color-border)] bg-[var(--color-base)] py-12 sm:py-16 select-none">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-7 flex items-end justify-between gap-5 sm:mb-9 text-left">
          <div className="max-w-xl">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--color-gold)]">The AllBarka Pantry</span>
            <h2 className="font-serif text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl text-left">Begin with what you crave</h2>
            <p className="mt-2 max-w-lg text-xs leading-relaxed text-[var(--color-ink-muted)] sm:text-sm text-left">Browse the complete boutique, seasonal value bundles, hand-graded dry fruits, savoury snacks, cold-pressed oils, and thoughtful gifts.</p>
          </div>
          <Link to="/shop" className="focus-ring hidden min-h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--color-gold)]/35 bg-[var(--color-surface)] px-5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-ink)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] sm:inline-flex">
            Explore all <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div 
          className="relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] rounded-2xl"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          role="region"
          aria-label="Category Carousel"
        >
          <div className="overflow-hidden cursor-grab active:cursor-grabbing" ref={emblaRef}>
            <div className="flex backface-hidden touch-pan-y" style={{ touchAction: 'pan-y pinch-zoom' }}>
              {categories.map((category, index) => (
                <div key={category.id} className="min-w-0 flex-none pl-4 first:pl-0 w-[calc(100%/1.8)] sm:w-[calc(100%/3.5)] lg:w-[calc(100%/5)] motion-reduce:transition-none motion-reduce:transform-none">
                  <Link
                    to={category.link}
                    className="group relative block w-full h-[280px] lg:h-[380px] overflow-hidden rounded-[1.5rem] border border-[var(--color-border-accent)] bg-[var(--color-surface)] shadow-[0_12px_32px_rgba(41,35,29,0.06)] focus-ring hover:border-[#C7982F]/60 hover:shadow-[0_0_0_1.5px_rgba(199,152,47,0.45),0_12px_32px_rgba(41,35,29,0.10)] transition-all duration-300 pointer-events-auto select-none motion-reduce:transition-none motion-reduce:transform-none"
                    aria-label={`Shop ${category.name}`}
                    draggable={false}
                  >
                    <img
                      src={category.image}
                      alt={t(category.altKey, category.name)}
                      draggable={false}
                      onError={(event) => { (event.currentTarget as HTMLImageElement).src = '/images/product-placeholder.svg'; }}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:transform-none"
                      loading={index < 2 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-emerald)]/95 via-[var(--color-emerald)]/30 to-transparent pointer-events-none" />
                    
                    {index < 2 && (
                      <span className="absolute left-3 top-3 rounded-full border border-white/25 bg-[var(--color-emerald)]/72 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-ivory)] backdrop-blur-md sm:left-4 sm:top-4 pointer-events-none z-10 shadow-sm">
                        {index === 0 ? 'Start here' : 'Popular value'}
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5 pointer-events-none z-10">
                      <div className="min-w-0 flex flex-col justify-end h-full">
                        <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-gold)] sm:text-[10px] drop-shadow-sm">{category.eyebrow}</span>
                        <h3 className="font-serif text-lg font-semibold leading-tight text-[var(--color-surface)] sm:text-xl block truncate drop-shadow-md">{category.luxuryName}</h3>
                      </div>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-surface)]/25 bg-[var(--color-surface)]/10 text-[var(--color-surface)] backdrop-blur-md transition-all group-hover:border-[var(--color-gold)] group-hover:bg-[var(--color-gold)] group-hover:text-[var(--color-emerald)] shadow-sm motion-reduce:transition-none motion-reduce:transform-none">
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
          
          {/* Edge fades - Ivory gradient (hides when scrolled fully to that side) */}
          <div 
            className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[var(--color-base)] sm:from-[var(--brand-ivory,#FDFBF7)] to-transparent transition-opacity duration-300 z-10 ${
              canScrollPrev ? 'opacity-100' : 'opacity-0'
            }`} 
          />
          <div 
            className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[var(--color-base)] sm:from-[var(--brand-ivory,#FDFBF7)] to-transparent transition-opacity duration-300 z-10 ${
              canScrollNext ? 'opacity-100' : 'opacity-0'
            }`} 
          />
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link
            to="/shop"
            className="inline-flex items-center justify-center w-full py-3 rounded-full bg-[var(--color-base)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-ink)] transition-colors hover:border-[var(--color-gold)]"
          >
            <span>Explore all products</span>
            <ArrowUpRight size={13} className="ml-1.5 text-[var(--color-gold)]" />
          </Link>
        </div>
      </div>
    </section>
  );
}

