import React from 'react';
import { AllBarkaCrestVector } from './AllBarkaLogo';

interface MobileHeaderBrandProps {
  onHomeClick: () => void;
}

/** Keep the boutique name visible on every visit, including after the intro. */
export default function MobileHeaderBrand({ onHomeClick }: MobileHeaderBrandProps) {
  return (
    <button
      type="button"
      onClick={onHomeClick}
      className="min-h-[44px] flex items-center gap-1.5 sm:gap-2 cursor-pointer focus-ring rounded-xl p-1 -m-1 select-none text-left"
      aria-label="AllBarka — Home"
    >
      <span className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full bg-[#042821] dark:bg-[#22382F] ring-1 ring-[#C7982F]/70 shadow-[0_2px_8px_rgba(4,40,33,0.18)] flex items-center justify-center p-0.5" aria-hidden="true">
        <AllBarkaCrestVector />
      </span>
      <span className="min-w-0 flex flex-col justify-center">
        <span className="font-serif font-bold text-[17px] sm:text-xl leading-none tracking-[0.015em] text-[#042821] dark:text-[#FFFCF7] whitespace-nowrap">
          AllBarka
        </span>
        <span className="mt-1 text-[7px] sm:text-[8px] font-semibold uppercase tracking-[0.11em] text-[#806326] dark:text-[#E4C783] leading-none whitespace-nowrap">
          PREMIUM · LAHORE
        </span>
      </span>
    </button>
  );
}
