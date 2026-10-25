import React from 'react';
import { AllBarkaCrestVector } from './AllBarkaLogo';

interface HeroStampBadgeProps {
  className?: string;
}

export default function HeroStampBadge({ className = '' }: HeroStampBadgeProps) {
  return (
    <div className={`relative flex items-center justify-center select-none group cursor-pointer ${className}`}>
      {/* Ambient Gold Glow Halo */}
      <div className="absolute inset-0 -m-4 rounded-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.32)_0%,rgba(212,175,55,0.1)_50%,transparent_75%)] blur-lg pointer-events-none group-hover:scale-110 transition-transform duration-500" />

      {/* Crest Medallion */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        <AllBarkaCrestVector />
      </div>
    </div>
  );
}

