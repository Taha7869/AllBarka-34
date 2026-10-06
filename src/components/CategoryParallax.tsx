
import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useDragScroll } from '../hooks/useDragScroll';

const CATEGORIES = [
  {
    id: "premium-deals",
    title: "Premium Deals",
    subtitle: "Exclusive offers",
    href: "/category/premium-deals",
    image: "https://images.unsplash.com/photo-1596422846543-74c6fc3fa23b?q=80&w=600",
  },
  {
    id: "dry-fruits",
    title: "Dry Fruits",
    subtitle: "Sun-dried selection",
    href: "/category/dry-fruits",
    image: "https://images.unsplash.com/photo-1601002598377-628d6722d326?q=80&w=600",
  },
  {
    id: "nuts",
    title: "Nuts",
    subtitle: "Roasted & raw",
    href: "/category/nuts",
    image: "https://images.unsplash.com/photo-1599576823337-33ee7bdcdfa7?q=80&w=600",
  },
  {
    id: "snacks",
    title: "Snacks",
    subtitle: "Everyday cravings",
    href: "/category/snacks",
    image: "https://images.unsplash.com/photo-1621259500057-0bfa7c58ed05?q=80&w=600",
  },
  {
    id: "seeds",
    title: "Seeds",
    subtitle: "Nutrient-rich selection",
    href: "/category/seeds",
    image: "https://images.unsplash.com/photo-1590740924083-6fcd00bdc08c?q=80&w=600",
  },
  {
    id: "gift-boxes",
    title: "Gift Boxes",
    subtitle: "Luxury gifting",
    href: "/category/gift-boxes",
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600",
  },
];

export default function CategoryParallax() {
  const targetRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useDragScroll<HTMLDivElement>();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"]
  });

  // Calculate horizontal translation.
  // Start from offscreen left (-20%) to offscreen right (15%).
  // This causes the items to "enter smoothly from the left and travel toward the right."
  const x = useTransform(scrollYProgress, [0, 1], ["-25%", "10%"]);

  const renderCards = () => (
    <React.Fragment>{CATEGORIES.map((cat, idx) => (
      <div 
        key={cat.id}
        onClick={() => navigate(cat.href)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if(e.key === 'Enter') navigate(cat.href) }}
        className={`relative flex-shrink-0 cursor-pointer group rounded-[32px] overflow-hidden 
          shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_40px_rgba(184,147,95,0.2)] 
          transition-all duration-500 transform hover:-translate-y-2
          border border-[var(--color-gold,#B8935F)]/20 hover:border-[var(--color-gold,#B8935F)]/50
          w-[260px] md:w-[320px] h-[320px] md:h-[360px] ${idx % 2 !== 0 ? 'md:mt-16' : ''}
        `}
      >
        <img 
          src={cat.image} 
          alt={cat.title} 
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
          <h3 className="text-2xl font-serif font-bold text-white mb-1 group-hover:text-[var(--color-gold,#B8935F)] transition-colors">{cat.title}</h3>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-white/80 uppercase tracking-widest font-bold">{cat.subtitle}</p>
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-[var(--color-gold,#B8935F)] transition-colors">
              <ArrowRight size={14} className="text-white" />
            </div>
          </div>
        </div>
      </div>
    ))}</React.Fragment>
  );

  return (
    <section className="relative w-full bg-white overflow-hidden py-10 md:py-0">
      
      {/* Mobile/Tablet View or Reduced Motion: Snap Carousel */}
      {(isMobile || prefersReducedMotion) ? (
        <div className="w-full py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-serif text-[var(--color-emerald-dark,#043327)] mb-4">Explore the AllBarka Collection</h2>
            <p className="text-[var(--color-ink)]/60 max-w-2xl mx-auto text-sm">Discover our hand-picked selection of premium dry fruits, nuts, and gifts.</p>
          </div>
          
          <div 
            ref={mobileScrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 px-4 pb-8 cursor-grab active:cursor-grabbing select-none" 
            style={{ scrollPaddingLeft: '1rem', touchAction: 'pan-x' }}
          >
            {CATEGORIES.map((cat) => (
              <div 
                key={cat.id}
                onClick={() => navigate(cat.href)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if(e.key === 'Enter') navigate(cat.href) }}
                className="snap-start relative flex-shrink-0 cursor-pointer group rounded-[28px] overflow-hidden 
                  shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[var(--color-gold,#B8935F)]/20
                  w-[85vw] max-w-[280px] h-[340px]"
              >
                <img 
                  src={cat.image} 
                  alt={cat.title} 
                  loading="lazy"
          decoding="async"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                  <h3 className="text-xl font-serif font-bold text-white mb-1">{cat.title}</h3>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-white/80 uppercase tracking-widest font-bold">{cat.subtitle}</p>
                    <ArrowRight size={14} className="text-white opacity-80" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-center">
             <button onClick={() => navigate('/shop')} className="px-8 py-3 bg-[var(--color-base,#FAF9F5)] text-[var(--color-emerald-dark,#043327)] border border-[var(--color-gold,#B8935F)]/30 font-bold uppercase tracking-widest text-[11px] rounded-full hover:bg-[var(--color-gold,#B8935F)] hover:text-white transition-all shadow-sm hover:shadow-md">
                 View All Items
             </button>
          </div>
        </div>
      ) : (
        /* Desktop Sticky Parallax View */
        <div ref={targetRef} className="h-[150vh] relative w-full">
          <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
            
            <div className="text-center mb-10 z-10 w-full max-w-7xl px-8">
              <h2 className="text-4xl sm:text-5xl font-serif text-[var(--color-emerald-dark,#043327)] mb-4">Explore the AllBarka Collection</h2>
              <p className="text-[var(--color-ink)]/60 max-w-2xl mx-auto text-sm sm:text-base">Discover our hand-picked selection of premium dry fruits, nuts, and gifts.</p>
            </div>

            {/* Parallax Container */}
            <motion.div 
              style={{ x }}
              className="flex gap-8 px-[5vw] will-change-transform"
            >
              {renderCards()}
            </motion.div>

          </div>
        </div>
      )}
      
      {!isMobile && !prefersReducedMotion && (
        <div className="w-full flex justify-center pb-20">
             <button onClick={() => navigate('/shop')} className="px-8 py-3 bg-[var(--color-base,#FAF9F5)] text-[var(--color-emerald-dark,#043327)] border border-[var(--color-gold,#B8935F)]/30 font-bold uppercase tracking-widest text-[11px] rounded-full hover:bg-[var(--color-gold,#B8935F)] hover:text-white transition-all shadow-sm hover:shadow-md cursor-pointer">
                 View All Items
             </button>
        </div>
      )}

    </section>
  );
}
