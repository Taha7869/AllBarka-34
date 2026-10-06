import React from 'react';

export default function LineArtTrustBadges() {
  const openInfoTab = (tab: string) => {
    window.dispatchEvent(new CustomEvent('open-info-modal', { detail: { tab } }));
  };

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-lg pt-4 select-none">
      
      {/* 1. Organic Grade-A Line Art Badge */}
      <button 
        type="button"
        onClick={() => openInfoTab('hand-sorting')}
        className="group relative p-3.5 rounded-2xl bg-[#0A2518]/80 border border-brand-gold/25 backdrop-blur-md text-center shadow-lg hover:border-brand-gold/60 transition-all duration-300 overflow-hidden cursor-pointer active:scale-95 text-left"
        title="View The Art of Hand-Sorting Standards"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-gold/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <svg
          className="w-6 h-6 mx-auto mb-1.5 text-brand-gold group-hover:scale-110 transition-transform duration-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" className="animate-pulse" />
          <path d="M12 8a4 4 0 0 0-4 4c0 3 4 5 4 5s4-2 4-5a4 4 0 0 0-4-4z" />
        </svg>
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-brand-cream block text-center">
          100% Organic
        </span>
        <span className="text-[8px] text-brand-gold/80 uppercase font-mono block mt-0.5 text-center">
          Grade-A Sorted →
        </span>
      </button>

      {/* 2. Same-Day Lahore Express Line Art Badge */}
      <button 
        type="button"
        onClick={() => openInfoTab('lahore-boutique')}
        className="group relative p-3.5 rounded-2xl bg-[#0A2518]/80 border border-brand-gold/25 backdrop-blur-md text-center shadow-lg hover:border-brand-gold/60 transition-all duration-300 overflow-hidden cursor-pointer active:scale-95 text-left"
        title="View AllBarka Boutique & Dispatch Protocol"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-gold/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <svg
          className="w-6 h-6 mx-auto mb-1.5 text-brand-gold group-hover:scale-110 transition-transform duration-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" className="animate-ping" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-brand-cream block text-center">
          Same-Day Lahore
        </span>
        <span className="text-[8px] text-brand-gold/80 uppercase font-mono block mt-0.5 text-center">
          Express Dispatch →
        </span>
      </button>

      {/* 3. Gold Casket Velvet Wrapped Line Art Badge */}
      <button 
        type="button"
        onClick={() => openInfoTab('vacuum-sealing')}
        className="group relative p-3.5 rounded-2xl bg-[#0A2518]/80 border border-brand-gold/25 backdrop-blur-md text-center shadow-lg hover:border-brand-gold/60 transition-all duration-300 overflow-hidden cursor-pointer active:scale-95 text-left"
        title="View Thermal Vacuum Sealing Freshness Tech"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-gold/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <svg
          className="w-6 h-6 mx-auto mb-1.5 text-brand-gold group-hover:scale-110 transition-transform duration-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-brand-cream block text-center">
          Gold Casket
        </span>
        <span className="text-[8px] text-brand-gold/80 uppercase font-mono block mt-0.5 text-center">
          Thermal Sealed →
        </span>
      </button>

    </div>
  );
}
