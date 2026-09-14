const fs = require('fs');

const content = `import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

const CATEGORIES = [
  {
    id: 'all',
    name: 'All Harvest',
    subtitle: 'Complete Single-Origin Collection',
    itemCount: '21 Varieties',
    image: '/images/mix_dryfruit.jpg.png',
    fallbackImage: 'https://images.unsplash.com/photo-1543257580-7269da773bf5?w=500&q=80',
    link: '/shop'
  },
  {
    id: 'nuts',
    name: 'Premium Nuts',
    subtitle: 'Pistachios, Cashews, Almonds',
    itemCount: '4 Selections',
    image: '/images/pista.jpg.png',
    fallbackImage: 'https://images.unsplash.com/photo-1508061253366-f7da15bbf6e4?w=500&q=80',
    link: '/shop/nuts'
  },
  {
    id: 'combos',
    name: 'Gift Boxes & Combos',
    subtitle: 'Royal Velvet Presentation Caskets',
    itemCount: '3 Curations',
    image: '/images/classics.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&q=80',
    link: '/shop/combos'
  },
  {
    id: 'dried-fruits',
    name: 'Sun-Dried Fruits',
    subtitle: 'Apricots, Plums, Figs, Dates',
    itemCount: '5 Selections',
    image: '/images/khubani.jpg.png',
    fallbackImage: 'https://images.unsplash.com/photo-1601002598377-628d6722d326?w=500&q=80',
    link: '/shop/dried-fruits'
  },
  {
    id: 'seeds',
    name: 'Superfood Seeds',
    subtitle: 'Chia, Pumpkin & Basil Seeds',
    itemCount: '4 Selections',
    image: '/images/pumpkin_seeds.jpg.png',
    fallbackImage: 'https://images.unsplash.com/photo-1590740924083-6fcd00bdc08c?w=500&q=80',
    link: '/shop/seeds'
  },
  {
    id: 'snacks',
    name: 'Roasted Savories',
    subtitle: 'Crispy Lahori Nimko & Roasted Chanay',
    itemCount: '4 Selections',
    image: '/images/nimko.jpg.png',
    fallbackImage: 'https://images.unsplash.com/photo-1621259500057-0bfa7c58ed05?w=500&q=80',
    link: '/shop/snacks'
  }
];

export default function CategoryCarousel() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.clientWidth * 0.75;
      const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.4;
    if (Math.abs(walk) > 6) setHasMoved(true);
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleCardClick = (link: string) => {
    if (!hasMoved) {
      navigate(link);
    }
  };

  return (
    <section className="w-full py-16 bg-[#FAF9F5] select-none border-b border-dashed border-[#191917]/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header with Navigation Controls */}
        <div className="flex items-end justify-between mb-8">
          <div className="text-left">
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#B8935F] block mb-1">
              Curated Varieties
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-[#191917]">
              Explore by Category
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="w-10 h-10 rounded-full border border-[#191917]/20 bg-white text-[#191917] hover:bg-[#191917] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              aria-label="Previous Category"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="w-10 h-10 rounded-full border border-[#191917]/20 bg-white text-[#191917] hover:bg-[#191917] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              aria-label="Next Category"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Track */}
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={\`flex gap-6 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth \${
            isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
          }\`}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x pan-y',
            overscrollBehaviorX: 'contain'
          }}
        >
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              onClick={() => handleCardClick(cat.link)}
              className="snap-start shrink-0 w-[260px] sm:w-[290px] group bg-white border border-[#191917]/15 hover:border-[#B8935F] rounded-3xl p-5 flex flex-col justify-between transition-all duration-400 hover:shadow-[0_16px_36px_rgba(25,25,23,0.06)] hover:-translate-y-1 relative cursor-pointer select-none text-left"
            >
              <div className="space-y-4">
                <div className="w-full aspect-square rounded-2xl bg-[#FAF9F5] border border-[#191917]/10 overflow-hidden flex items-center justify-center p-3">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    draggable={false}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = cat.fallbackImage;
                    }}
                    className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-700 ease-out pointer-events-none"
                    loading="lazy"
                  />
                </div>

                <div>
                  <span className="text-[9.5px] font-sans font-bold uppercase tracking-wider text-[#B8935F] block">
                    {cat.itemCount}
                  </span>
                  <h3 className="text-xl font-serif font-normal text-[#191917] group-hover:text-[#B8935F] transition-colors mt-0.5">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-[#191917]/65 leading-relaxed font-sans font-normal line-clamp-1 mt-0.5">
                    {cat.subtitle}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-dashed border-[#191917]/15 flex items-center justify-between text-xs font-sans font-bold text-[#191917]">
                <span className="text-[10px] uppercase tracking-widest text-[#191917]/70">VIEW SELECTION</span>
                <div className="w-7 h-7 rounded-full bg-[#FAF9F5] border border-[#191917]/15 text-[#191917] flex items-center justify-center group-hover:bg-[#191917] group-hover:text-white transition-colors">
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
`;

fs.writeFileSync('src/components/CategoryCarousel.tsx', content);
