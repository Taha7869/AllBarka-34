import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import { Sparkles, ArrowDown, X, Eye } from 'lucide-react';

export interface GalleryItem {
  id: string;
  number: string;
  image: string;
  title?: string;
  tagline?: string;
  origin?: string;
}

const DEFAULT_ITEMS: GalleryItem[] = [
  {
    id: '1',
    number: '#001',
    image: '/images/almonds.jpg',
    title: 'Kagzi Almonds',
    tagline: 'Sun-dried high altitude orchards',
    origin: 'Northern Valleys',
  },
  {
    id: '2',
    number: '#002',
    image: '/images/walnuts.jpg',
    title: 'Chilean Walnuts',
    tagline: 'Extra light halves with natural oils',
    origin: 'Hand-cracked harvest',
  },
  {
    id: '3',
    number: '#003',
    image: '/images/pistachio.jpg',
    title: 'Jumbo Saffron Pistachio',
    tagline: 'Lightly sea-salted & wood roasted',
    origin: 'Balochistan & Persian Select',
  },
  {
    id: '4',
    number: '#004',
    image: '/images/cashews.jpg',
    title: 'W240 Royal Cashews',
    tagline: 'Buttery texture with creamy crunch',
    origin: 'Premium Single-Estate',
  },
  {
    id: '5',
    number: '#005',
    image: '/images/figs.jpg',
    title: 'Afghan Garland Figs (Injeer)',
    tagline: 'Naturally rich in honeyed syrup',
    origin: 'Sun-cured traditional garland',
  },
];

interface ScrollImageCardProps {
  item: GalleryItem;
  index: number;
}

const ScrollImageCard: React.FC<ScrollImageCardProps> = ({ item }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Exact scroll-linked offset logic mapped from motion animate(item, { opacity: [0, 1, 1, 0] })
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'end end', 'start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.88, 1, 1, 0.88]);
  const y = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [40, 0, 0, -40]);

  return (
    <section
      ref={cardRef}
      className="img-container min-h-[max(550px,100svh)] snap-start flex justify-center items-center relative overflow-visible px-2 sm:px-4 select-none"
    >
      <motion.div
        style={{ opacity, scale, y }}
        className="relative w-[min(84vw,290px)] sm:w-[340px] md:w-[380px] h-[400px] sm:h-[460px] md:h-[500px] mx-2 sm:mx-5 bg-[#2B1B17] rounded-3xl border-2 border-[#D4AF6A]/40 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(212,175,106,0.15)] overflow-hidden group"
      >
        {/* Background Image */}
        <img
          src={item.image}
          alt={item.title || item.number}
          className="w-full h-full object-cover brightness-95 group-hover:scale-105 transition-transform duration-700 ease-out"
          onError={(e) => {
            // Fallback placeholder if custom image path not found
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80';
          }}
        />

        {/* Ambient Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#2B1B17] via-[#2B1B17]/30 to-black/20" />

        {/* Bottom Details */}
        <div className="absolute bottom-0 inset-x-0 p-5 sm:p-6 text-left z-10">
          {item.origin && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1C1210]/80 border border-[#D4AF6A]/40 text-[#D4AF6A] text-[10px] font-black uppercase tracking-widest mb-1.5 backdrop-blur-md">
              <Sparkles size={10} />
              <span>{item.origin}</span>
            </div>
          )}
          {item.title && (
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#faf9f5] tracking-tight leading-tight">
              {item.title}
            </h3>
          )}
          {item.tagline && (
            <p className="text-xs sm:text-sm text-[#faf9f5]/75 font-sans mt-1">
              {item.tagline}
            </p>
          )}
        </div>

        {/* Floating Monospace Number Stamp (#001, #002, etc.) */}
        <motion.h2
          className="absolute text-5xl sm:text-6xl md:text-7xl font-mono font-black text-[#D4AF6A] tracking-[-3px] drop-shadow-[0_8px_30px_rgba(0,0,0,0.95)] select-none pointer-events-none z-20 top-[calc(50%-35px)] left-[calc(50%+80px)] sm:left-[calc(50%+110px)] md:left-[calc(50%+130px)] whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-br from-[#f8e7b9] via-[#D4AF6A] to-[#8C6B1B]"
        >
          {item.number}
        </motion.h2>
      </motion.div>
    </section>
  );
}

interface ScrollImageGalleryProps {
  items?: GalleryItem[];
  onClose?: () => void;
  isModal?: boolean;
}

export const ScrollImageGallery: React.FC<ScrollImageGalleryProps> = ({
  items = DEFAULT_ITEMS,
  onClose,
  isModal = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Global scroll progress indicator for the gallery container
  const { scrollYProgress } = useScroll({
    container: isModal ? containerRef : undefined,
  });

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    restDelta: 0.001,
  });

  return (
    <div
      ref={containerRef}
      id="scroll-image-gallery"
      className={`relative w-full bg-[#1C1210] text-[#faf9f5] antialiased overflow-y-auto ${
        isModal
          ? 'fixed inset-0 z-50 h-screen snap-y snap-mandatory'
          : 'h-auto snap-y snap-mandatory'
      }`}
      style={{ scrollBehavior: 'smooth' }}
    >
      {/* ── Fixed Top Progress Bar ────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-[#2B1B17] z-50">
        <motion.div
          style={{ scaleX }}
          className="h-full bg-gradient-to-r from-[#D4AF6A] via-[#f8e7b9] to-[#D4AF6A] origin-left shadow-[0_0_12px_rgba(212,175,106,0.8)]"
        />
      </div>

      {/* ── Fixed Control Bar / Header ────────────────────────────────────── */}
      <header className="fixed top-3 sm:top-5 inset-x-0 z-40 max-w-5xl mx-auto px-4 pointer-events-none flex items-center justify-between">
        <div className="pointer-events-auto bg-[#2B1B17]/85 backdrop-blur-xl border border-[#D4AF6A]/40 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-serif text-[#faf9f5]">
          <span className="w-2 h-2 rounded-full bg-[#D4AF6A] animate-pulse" />
          <span className="font-bold text-[#D4AF6A]">ALLBARKA</span>
          <span className="text-white/40">|</span>
          <span className="tracking-wide">Harvest Chronicle</span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            type="button"
            className="pointer-events-auto w-10 h-10 rounded-full bg-[#2B1B17]/85 backdrop-blur-xl border border-[#D4AF6A]/40 text-[#faf9f5] hover:text-[#D4AF6A] flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
            aria-label="Close Gallery"
          >
            <X size={18} />
          </button>
        )}
      </header>

      {/* ── Scroll Cue ────────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-1.5 text-[11px] font-sans font-bold uppercase tracking-widest text-[#D4AF6A]/80 bg-[#2B1B17]/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#D4AF6A]/30">
        <span>Scroll to Explore</span>
        <motion.div
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ArrowDown size={13} className="text-[#D4AF6A]" />
        </motion.div>
      </div>

      {/* ── Gallery Items ─────────────────────────────────────────────────── */}
      <main className="relative z-10 w-full flex flex-col">
        {items.map((item, index) => (
          <ScrollImageCard key={item.id || index} item={item} index={index} />
        ))}
      </main>
    </div>
  );
};

export default ScrollImageGallery;
