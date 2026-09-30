import React from 'react';

interface LogoLoopProps {
  logos?: string[];
  direction?: 'left' | 'right';
  fadeOut?: boolean;
  fadeOutColor?: string;
  speed?: number; // duration in seconds
}

export default function LogoLoop({
  logos = [
    "Visa",
    "Mastercard",
    "Raast Instant Pay",
    "HBL Pay",
    "Bank Alfalah (Alfa)",
    "Trax Logistics",
    "Leopards Courier",
    "Cash on Delivery",
    "Meezan Bank",
    "Faysal Bank"
  ],
  direction = 'left',
  fadeOut = true,
  fadeOutColor = "#FFFFFF",
  speed = 28
}: LogoLoopProps) {
  // Duplicate logos list to ensure perfect infinite looping without empty gaps
  const items = [...logos, ...logos, ...logos, ...logos];

  return (
    <div className="relative w-full overflow-hidden whitespace-nowrap py-4 select-none">
      {/* Optional Fade Out Edges for Luxury Seamless Flow */}
      {fadeOut && (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 z-10 pointer-events-none"
            style={{
              background: `linear-gradient(to right, ${fadeOutColor}, transparent)`
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 z-10 pointer-events-none"
            style={{
              background: `linear-gradient(to left, ${fadeOutColor}, transparent)`
            }}
          />
        </>
      )}

      {/* Scrolling Marquee Container */}
      <div className="flex w-max items-center">
        <div
          className="flex gap-4 sm:gap-6 whitespace-nowrap px-6 items-center"
          style={{
            animation: `marquee-${direction} ${speed}s linear infinite`
          }}
        >
          {items.map((logo, index) => (
            <div
              key={index}
              className="group flex items-center gap-2.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/35 hover:border-[var(--color-gold,#B8935F)] shadow-xs hover:shadow-md transition-all duration-300 hover:scale-105"
            >
              <span className="text-[var(--color-gold,#B8935F)] text-sm font-serif">⚜</span>
              <span className="text-[var(--color-ink,#1A1A1A)] text-xs sm:text-sm font-serif font-black tracking-wider uppercase group-hover:text-[var(--color-gold,#B8935F)] transition-colors">
                {logo}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
