import React from 'react';

export default function CompassScrollCue() {
  const handleScrollClick = () => {
    const section = document.getElementById('products');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      onClick={handleScrollClick}
      className="group cursor-pointer flex flex-col items-center gap-2 select-none pt-8 z-20 relative"
    >
      {/* Compass Ring & Spinning Needle */}
      <div className="relative w-12 h-12 rounded-full border-2 border-[var(--color-gold,#B8935F)]/40 bg-[var(--color-surface,#FFFFFF)] backdrop-blur-md flex items-center justify-center shadow-xs group-hover:border-[var(--color-gold,#B8935F)] group-hover:shadow-md transition-all duration-500">
        
        {/* Orbiting Compass Cardinal Ring */}
        <div className="absolute inset-0 rounded-full border border-dashed border-[var(--color-gold,#B8935F)]/30 animate-[spin_20s_linear_infinite]" />

        {/* Compass Cardinal Points */}
        <span className="absolute top-1 text-[7px] font-black font-mono text-[var(--color-gold,#B8935F)]/60">N</span>
        <span className="absolute bottom-1 text-[7px] font-black font-mono text-[var(--color-gold,#B8935F)]">S</span>

        {/* Compass Needle pointing downward */}
        <div className="w-1 h-6 bg-gradient-to-b from-[var(--color-gold-light,#D4B483)] via-[var(--color-gold,#B8935F)] to-[var(--color-gold,#B8935F)]/20 rounded-full animate-bounce transition-transform duration-300 group-hover:scale-125" />
      </div>

      <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--color-gold,#B8935F)] group-hover:text-[var(--color-ink,#1A1A1A)] font-sans font-bold transition-colors">
        Scroll to Explore Dry Fruit Vault
      </span>
    </div>
  );
}
