import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useDragScroll } from '../hooks/useDragScroll';
import { PRODUCTS } from '../data/products';

const getDynamicCategories = () => [
  {
    id: 'all',
    name: 'All Items',
    subtitle: 'Complete Curated Single-Origin Collection',
    itemCount: `${PRODUCTS.length} Varieties`,
    image: '/images/dryfruit_flatlay_hero.webp',
    fallbackImage: 'https://images.unsplash.com/photo-1543257580-7269da773bf5?w=500&q=80',
    link: '/shop'
  },
  {
    id: 'nuts',
    name: 'Premium Nuts',
    subtitle: 'Pistachios, Cashews, Almonds & Walnuts',
    itemCount: `${PRODUCTS.filter((p) => p.category === 'nuts').length} Selections`,
    image: '/images/hero_composite_display.webp',
    fallbackImage: 'https://images.unsplash.com/photo-1508061253366-f7da15bbf6e4?w=500&q=80',
    link: '/shop/nuts'
  },
  {
    id: 'combos',
    name: 'Gift Boxes & Deals',
    subtitle: 'Royal Presentation Assortments',
    itemCount: `${PRODUCTS.filter((p) => p.category === 'combos').length} Curations`,
    image: '/images/hero_composite_luxury.webp',
    fallbackImage: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&q=80',
    link: '/shop/combos'
  },
  {
    id: 'dried-fruits',
    name: 'Sun-Dried Fruits',
    subtitle: 'Apricots, Plums, Figs & Dates',
    itemCount: `${PRODUCTS.filter((p) => p.category === 'dried-fruits').length} Selections`,
    image: '/images/dryfruit_flatlay_hero_1786577987546.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1601002598377-628d6722d326?w=500&q=80',
    link: '/shop/dried-fruits'
  },
  {
    id: 'seeds',
    name: 'Superfood Seeds',
    subtitle: 'Organic Chia & Roasted Pumpkin Seeds',
    itemCount: `${PRODUCTS.filter((p) => p.category === 'seeds').length} Selections`,
    image: '/images/hero.webp',
    fallbackImage: 'https://images.unsplash.com/photo-1590740924083-6fcd00bdc08c?w=500&q=80',
    link: '/shop/seeds'
  },
  {
    id: 'snacks',
    name: 'Traditional Savories',
    subtitle: 'Lahori Roasted Chanay & Crispy Nimko',
    itemCount: `${PRODUCTS.filter((p) => p.category === 'snacks').length} Selections`,
    image: '/images/hero_composite_display.webp',
    fallbackImage: 'https://images.unsplash.com/photo-1621259500057-0bfa7c58ed05?w=500&q=80',
    link: '/shop/snacks'
  }
];

export default function CategoryCarousel() {
  const navigate = useNavigate();
  const scrollRef = useDragScroll<HTMLDivElement>();
  const categories = React.useMemo(() => getDynamicCategories(), []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.clientWidth * 0.75;
      const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleCardClick = (link: string) => {
    navigate(link);
  };

  return (
    <section className="w-full py-16 bg-[var(--color-base)] select-none border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header with Navigation Controls */}
        <div className="flex items-end justify-between mb-8">
          <div className="text-left">
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[var(--color-gold)] block mb-1">
              Curated Varieties
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-[var(--color-ink)]">
              Explore by Category
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="w-10 h-10 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-emerald)] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              aria-label="Previous Category"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="w-10 h-10 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-emerald)] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              aria-label="Next Category"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Track */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth cursor-grab active:cursor-grabbing select-none"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain'
          }}
        >
          {categories.map((cat) => (
            <div
              key={cat.id}
              role="button"
              tabIndex={0}
              onClick={() => handleCardClick(cat.link)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(cat.link);
                }
              }}
              className="snap-start shrink-0 w-[260px] sm:w-[290px] group bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-gold)] rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-1 relative cursor-pointer select-none text-left"
            >
              <div className="space-y-4">
                <div className="w-full aspect-square rounded-2xl bg-[var(--color-base)] border border-[var(--color-border)] overflow-hidden flex items-center justify-center p-3">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    draggable={false}
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src !== cat.fallbackImage) {
                        img.src = cat.fallbackImage;
                      }
                    }}
                    className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-700 ease-out pointer-events-none"
                    loading="lazy"
                  />
                </div>

                <div>
                  <span className="text-[9.5px] font-sans font-bold uppercase tracking-wider text-[var(--color-gold)] block">
                    {cat.itemCount}
                  </span>
                  <h3 className="text-xl font-serif font-normal text-[var(--color-ink)] group-hover:text-[var(--color-gold)] transition-colors mt-0.5">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed font-sans font-normal line-clamp-1 mt-0.5">
                    {cat.subtitle}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-dashed border-[var(--color-border)] flex items-center justify-between text-xs font-sans font-bold text-[var(--color-ink)]">
                <span className="text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)]">VIEW SELECTION</span>
                <div className="w-7 h-7 rounded-full bg-[var(--color-base)] border border-[var(--color-border)] text-[var(--color-ink)] flex items-center justify-center group-hover:bg-[var(--color-emerald)] group-hover:text-white transition-colors">
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
