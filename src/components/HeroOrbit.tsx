import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Sparkles, Truck, Award } from 'lucide-react';
import CircularText from './CircularText';

interface OrbitItem {
  id: string;
  icon: string | React.ReactNode;
  label: string;
  sublabel?: string;
  angle: number; // Angle in degrees (0 - 360)
  radiusOffset?: number;
}

const ORBIT_ITEMS: OrbitItem[] = [
  {
    id: 'pistachios',
    icon: '🌰',
    label: 'Premium Pistachios',
    sublabel: 'Iranian & Himalayan',
    angle: 0,
  },
  {
    id: 'pure',
    icon: <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />,
    label: '100% Pure & Organic',
    sublabel: 'Lab Verified',
    angle: 90,
  },
  {
    id: 'hand-sorted',
    icon: <Sparkles className="w-3.5 h-3.5 text-[#f6d77f]" />,
    label: 'Hand-Sorted',
    sublabel: 'Zero Broken Nuts',
    angle: 180,
  },
  {
    id: 'delivery',
    icon: <Truck className="w-3.5 h-3.5 text-[#d4af37]" />,
    label: 'Fast Lahore Delivery',
    sublabel: 'Same-Day Dispatch',
    angle: 270,
  },
];

interface HeroOrbitProps {
  children: React.ReactNode;
  className?: string;
}

export default function HeroOrbit({ children, className = '' }: HeroOrbitProps) {
  return (
    <div className={`relative flex items-center justify-center select-none group max-w-full overflow-x-clip sm:overflow-visible ${className}`}>
      {/* ── Background Subtle Gold Ambient Glow ────────────────────────── */}
      <div className="absolute inset-0 -m-6 sm:-m-12 rounded-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.18)_0%,rgba(4,51,39,0.25)_45%,transparent_75%)] blur-2xl pointer-events-none" />

      {/* ── Outer Orbital Track (Radius scaled for 360px+ screens) ───── */}
      <div className="absolute w-[180px] h-[180px] xs:w-[210px] xs:h-[210px] sm:w-[380px] sm:h-[380px] md:w-[460px] md:h-[460px] rounded-full border border-[#d4af37]/20 border-dashed pointer-events-none" />
      
      {/* ── Inner Accent Orbital Ring ──────────────────────────────────── */}
      <div className="absolute w-[140px] h-[140px] xs:w-[160px] xs:h-[160px] sm:w-[280px] sm:h-[280px] md:w-[340px] md:h-[340px] rounded-full border border-[#d4af37]/10 pointer-events-none" />

      {/* ── Rotating Orbit Container (Clockwise, 20s per rotation) ─────── */}
      <div className="absolute w-[180px] h-[180px] xs:w-[210px] xs:h-[210px] sm:w-[380px] sm:h-[380px] md:w-[460px] md:h-[460px] rounded-full pointer-events-none animate-[spin_20s_linear_infinite] group-hover:[animation-play-state:paused]">
        {ORBIT_ITEMS.map((item) => {
          // Calculate positions along the circle based on angle
          const angleRad = (item.angle * Math.PI) / 180;
          // Percentage coordinates from 0% to 100% (center at 50%, 50%)
          const x = 50 + 50 * Math.cos(angleRad);
          const y = 50 + 50 * Math.sin(angleRad);

          return (
            <div
              key={item.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              style={{
                left: `${x}%`,
                top: `${y}%`,
              }}
            >
              {/* Counter-rotating badge container (Counter-clockwise to keep badges upright) */}
              <div className="animate-[spin_20s_linear_infinite_reverse] group-hover:[animation-play-state:paused]">
                <div className="relative group/badge transition-all duration-300 hover:scale-110 cursor-pointer">
                  {/* Badge Capsule */}
                  <div className="flex items-center gap-1 sm:gap-2 px-1.5 xs:px-2 sm:px-3 py-0.5 xs:py-1 sm:py-1.5 rounded-full bg-[#2B1B17]/95 hover:bg-[#1C1210] border border-[#D4AF6A]/45 hover:border-[#D4AF6A] shadow-[0_4px_16px_rgba(0,0,0,0.7),0_0_12px_rgba(212,175,106,0.25)] backdrop-blur-md transition-colors">
                    {/* Small glowing pip or icon */}
                    <span className="flex items-center justify-center text-[10px] sm:text-sm shrink-0">
                      {item.icon}
                    </span>

                    {/* Text block */}
                    <div className="flex flex-col text-left">
                      <span className="text-[7.5px] xs:text-[8.5px] sm:text-[10.5px] md:text-[11px] font-bold text-white tracking-wide whitespace-nowrap leading-tight">
                        {item.label}
                      </span>
                      {item.sublabel && (
                        <span className="text-[7px] sm:text-[8px] font-medium text-[#D4AF6A]/80 tracking-wider uppercase leading-none mt-0.5 hidden sm:block">
                          {item.sublabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Micro Golden Sparkle Dot */}
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#fde68a] border border-[#D4AF6A] shadow-[0_0_6px_#fde68a] opacity-80 group-hover/badge:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Circular Rotating Royal Text Seal (React Bits CircularText) ─ */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[170px] h-[170px] xs:w-[200px] xs:h-[200px] sm:w-[280px] sm:h-[280px] md:w-[320px] md:h-[320px] pointer-events-auto select-none z-0">
        <CircularText
          text="★ ALLBARKA LUXURY ★ 100% ORGANIC & HAND-SORTED ★ LAHORE "
          spinDuration={25}
          onHover="slowDown"
          className="text-[6.5px] xs:text-[7.5px] sm:text-[9.5px] md:text-[10.5px] font-black uppercase text-[#E5D0A1] tracking-[0.2em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] opacity-80 hover:opacity-100 transition-opacity"
        />
      </div>

      {/* ── Center Content (The Main AllBarka Brand Logo) ──────────────── */}
      <div className="relative z-10 flex items-center justify-center p-2 sm:p-5">
        {children}
      </div>
    </div>
  );
}
