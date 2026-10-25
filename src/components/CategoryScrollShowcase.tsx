import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useDragScroll } from '../hooks/useDragScroll';

import img1 from '../assets/images/hero_composite_luxury.webp';
import img2 from '../assets/images/dryfruit_flatlay_hero.webp';
import img3 from '../assets/images/hero_composite_display.webp';
import img4 from '../assets/images/hero.webp';

const CATEGORIES = [
  {
    id: "premium-deals",
    title: "Premium Deals",
    subtitle: "Exclusive offers",
    href: "/category/premium-deals",
    image: img1,
  },
  {
    id: "dry-fruits",
    title: "Dry Fruits",
    subtitle: "Sun-dried selection",
    href: "/category/dry-fruits",
    image: img2,
  },
  {
    id: "nuts",
    title: "Nuts",
    subtitle: "Roasted & raw",
    href: "/category/nuts",
    image: img3,
  },
  {
    id: "snacks",
    title: "Snacks",
    subtitle: "Everyday cravings",
    href: "/category/snacks",
    image: img4,
  },
  {
    id: "seeds",
    title: "Seeds",
    subtitle: "Nutrient-rich selection",
    href: "/category/seeds",
    image: img1,
  },
  {
    id: "gift-boxes",
    title: "Gift Boxes",
    subtitle: "Luxury gifting",
    href: "/category/gift-boxes",
    image: img2,
  },
];

export default function CategoryScrollShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useDragScroll<HTMLDivElement>();

  const [maxTravel, setMaxTravel] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  const prefersReducedMotion = useReducedMotion();

  // Measure function
  const measureLayout = () => {
    if (!viewportRef.current || !trackRef.current) return;
    const viewportWidth = viewportRef.current.clientWidth;
    const trackWidth = trackRef.current.scrollWidth;
    setMaxTravel(Math.max(0, trackWidth - viewportWidth));
    
    setIsMobile(window.innerWidth < 768);
  };

  useEffect(() => {
    measureLayout();

    const resizeObserver = new ResizeObserver(() => {
      measureLayout();
    });

    if (viewportRef.current) {
      resizeObserver.observe(viewportRef.current);
    }
    if (trackRef.current) {
      resizeObserver.observe(trackRef.current);
    }
    window.addEventListener('resize', measureLayout);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measureLayout);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"]
  });

  const x = useTransform(scrollYProgress, [0.1, 0.9], [0, -maxTravel]);

  // Section height calculation
  const scrollDistance = Math.max(
    window.innerHeight * 0.55,
    Math.min(maxTravel, window.innerHeight * 1.1)
  );
  // We only add scrollDistance to 100vh if there is maxTravel, but let's just make it a state or style
  const sectionHeight = isMobile || prefersReducedMotion 
    ? 'auto' 
    : `calc(100vh + ${scrollDistance}px)`;

  const renderCards = () => (
    <React.Fragment>
    {CATEGORIES.map((cat) => (
      <Link 
        to={cat.href}
        key={cat.id}
        className="relative block flex-shrink-0 cursor-pointer group rounded-[28px] sm:rounded-[32px] overflow-hidden 
          shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_40px_rgba(184,147,95,0.2)] 
          transition-all duration-500 transform hover:-translate-y-2
          border border-[var(--color-gold,#B8935F)]/20 hover:border-[var(--color-gold,#B8935F)]/60
          w-[280px] h-[350px] md:w-[320px] md:h-[380px]
          snap-center sm:snap-align-none"
      >
        <img 
          src={cat.image} 
          alt={cat.title} 
          loading="lazy"
          decoding="async"
          onLoad={measureLayout}
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
      </Link>
    ))
    }</React.Fragment>
  );

  return (
    <section 
      ref={sectionRef} 
      className="relative w-full bg-white"
      style={{ height: sectionHeight }}
    >
      {(isMobile || prefersReducedMotion) ? (
        <div className="w-full py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-serif text-[#043327] mb-4">Explore the AllBarka Collection</h2>
            <p className="text-[#120F17]/60 max-w-2xl mx-auto text-sm">Discover our hand-picked selection of premium dry fruits, nuts, and gifts.</p>
          </div>
          
          <div 
            ref={mobileScrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-6 px-4 pb-8 cursor-grab active:cursor-grabbing select-none" 
            style={{ scrollPaddingLeft: '1rem', scrollPaddingRight: '1rem', touchAction: 'pan-x' }}
          >
            {renderCards()}
          </div>

          <div className="mt-4 flex justify-center">
             <Link to="/shop" className="px-8 py-3 bg-[#FAF9F5] text-[#043327] border border-[#D4AF37]/30 font-bold uppercase tracking-widest text-[11px] rounded-full hover:bg-[#D4AF37] hover:text-white transition-all shadow-sm hover:shadow-md text-center">
                 View All Items
             </Link>
          </div>
        </div>
      ) : (
        <div ref={stickyRef} className="sticky top-0 min-h-[100svh] flex flex-col justify-center">
          <header className="text-center mb-10 z-10 w-full max-w-7xl mx-auto px-8">
            <h2 className="text-4xl sm:text-5xl font-serif text-[#043327] mb-4">Explore the AllBarka Collection</h2>
            <p className="text-[#120F17]/60 max-w-2xl mx-auto text-sm sm:text-base">Discover our hand-picked selection of premium dry fruits, nuts, and gifts.</p>
          </header>

          <div ref={viewportRef} className="w-full overflow-hidden">
            <motion.div 
              ref={trackRef}
              style={{ x }}
              className="flex w-max gap-6 sm:gap-8 px-[5vw] xl:px-[10vw]"
            >
              {renderCards()}
            </motion.div>
          </div>

          <div className="w-full flex justify-center mt-10">
             <Link to="/shop" className="px-8 py-3 bg-[#FAF9F5] text-[#043327] border border-[#D4AF37]/30 font-bold uppercase tracking-widest text-[11px] rounded-full hover:bg-[#D4AF37] hover:text-white transition-all shadow-sm hover:shadow-md text-center">
                 View All Items
             </Link>
          </div>
        </div>
      )}
    </section>
  );
}
