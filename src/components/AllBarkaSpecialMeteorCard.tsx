import React from "react";
import { Meteors } from "./ui/meteors";
import { Sparkles } from "lucide-react";

interface AllBarkaSpecialMeteorCardProps {
  onClaimOffer?: () => void;
}

export function AllBarkaSpecialMeteorCard({ onClaimOffer }: AllBarkaSpecialMeteorCardProps = {}) {
  return (
    <div className="w-full">
      <div className="relative w-full max-w-xl mx-auto">
        {/* Background ambient glow matching luxury gold tone */}
        <div className="absolute inset-0 h-full w-full scale-[0.80] transform rounded-full bg-[var(--color-gold,#B8935F)] blur-3xl opacity-15 pointer-events-none" />
        
        {/* Card Container styled with Whitish/Gold palette */}
        <div className="relative flex h-full flex-col items-start justify-end overflow-hidden rounded-2xl border-2 border-[var(--color-gold,#B8935F)]/35 bg-[var(--color-surface,#FFFFFF)] px-6 py-8 shadow-lg">
          
          {/* Icon Badge */}
          <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-gold,#B8935F)]/40 bg-[var(--color-cream,#FAF9F5)] text-[var(--color-gold,#B8935F)] shadow-xs">
            <Sparkles size={16} />
          </div>

          {/* Heading */}
          <h2 className="relative z-50 mb-2 text-xl font-bold text-[var(--color-ink,#1A1A1A)] tracking-wide font-serif">
            The Ultimate Work-Day Fuel Deal
          </h2>

          {/* Description */}
          <p className="relative z-50 mb-6 text-sm font-normal text-[var(--color-ink-muted,#5A5A5A)] leading-relaxed">
            Handpicked premium Californian almonds, crunchy walnuts, and select organic dry fruits packed for your daily energy. Direct from Lahore HQ with guaranteed freshness.
          </p>

          {/* Action Button */}
          <button 
            onClick={onClaimOffer}
            className="relative z-50 rounded-xl border border-[var(--color-gold,#B8935F)] bg-[var(--color-gold,#B8935F)] px-5 py-2 text-sm font-bold text-white hover:bg-[var(--color-gold-light,#D4B483)] transition-all duration-300 shadow-xs cursor-pointer active:scale-95"
          >
            Claim Offer Now
          </button>

          {/* Falling Meteors Effect */}
          <Meteors number={15} />
        </div>
      </div>
    </div>
  );
}
