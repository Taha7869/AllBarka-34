import React, { useId } from 'react';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'gold' | 'on-light' | 'on-dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'div';
}

/**
 * High-Precision Ornate Gold Botanical Crest Vector
 * Matches the official AllBarka luxury emblem:
 * - Royal Lotus/Almond Top Blossom
 * - Intertwined Botanical Serif 'A' & 'B'
 * - Leafy Vine Foliage
 * - Open Symmetrical Walnut Kernel at Base
 * - Symmetrical Acanthus / Laurel Leaf Base Scrolls
 */
export function AllBarkaCrestVector({ className = '' }: { className?: string }) {
  const rawId = useId();
  // Sanitize id for valid SVG identifier (remove colons from React 18 useId)
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const goldMainId = `abGoldMain_${id}`;
  const goldLightId = `abGoldLight_${id}`;
  const goldShimmerId = `abGoldShimmer_${id}`;

  return (
    <svg
      viewBox="0 0 220 220"
      className={`w-full h-full drop-shadow-[0_1px_3px_rgba(212,175,55,0.25)] ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Rich Multidimensional Metallic Gold Gradients - scoped per instance */}
        <linearGradient id={goldMainId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFDF2" />
          <stop offset="20%" stopColor="#F9E28E" />
          <stop offset="45%" stopColor="#D4AF37" />
          <stop offset="75%" stopColor="#B38926" />
          <stop offset="100%" stopColor="#876211" />
        </linearGradient>

        <linearGradient id={goldLightId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C49B2C" />
          <stop offset="35%" stopColor="#FEF3C7" />
          <stop offset="70%" stopColor="#E2BD4E" />
          <stop offset="100%" stopColor="#F5D87F" />
        </linearGradient>

        <linearGradient id={goldShimmerId} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#FDE68A" />
          <stop offset="80%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
      </defs>

      {/* ── 1. Top Royal Lotus / Almond Bud Blossom ─────────────────── */}
      {/* Central Teardrop Petal */}
      <path
        d="M110 16 C104 27 101 37 101 46 C105 52 115 52 119 46 C119 37 116 27 110 16 Z"
        fill={`url(#${goldMainId})`}
      />
      <path
        d="M110 22 C107 29 105 37 105 44 C107 47 113 47 115 44 C115 37 113 29 110 22 Z"
        fill={`url(#${goldShimmerId})`}
        opacity="0.9"
      />
      {/* Left Blossom Wing Petal */}
      <path
        d="M99 26 C91 32 87 40 92 50 C99 49 103 42 101 31 Z"
        fill={`url(#${goldLightId})`}
      />
      {/* Right Blossom Wing Petal */}
      <path
        d="M121 26 C129 32 133 40 128 50 C121 49 117 42 119 31 Z"
        fill={`url(#${goldLightId})`}
      />

      {/* ── 2. Botanical Vine & Leaf Scrolls (Upper & Sides) ───────── */}
      {/* Left Upper Leaf Cluster */}
      <path
        d="M86 48 C77 47 70 56 75 66 C84 64 88 55 86 48 Z"
        fill={`url(#${goldMainId})`}
      />
      <path
        d="M72 70 C63 74 61 85 68 92 C75 88 78 78 72 70 Z"
        fill={`url(#${goldLightId})`}
      />
      <path
        d="M94 65 C87 67 83 76 87 83 C94 81 97 73 94 65 Z"
        fill={`url(#${goldMainId})`}
      />

      {/* Right Upper Leaf Cluster */}
      <path
        d="M134 48 C143 47 150 56 145 66 C136 64 132 55 134 48 Z"
        fill={`url(#${goldMainId})`}
      />
      <path
        d="M148 70 C157 74 159 85 152 92 C145 88 142 78 148 70 Z"
        fill={`url(#${goldLightId})`}
      />
      <path
        d="M126 65 C133 67 137 76 133 83 C126 81 123 73 126 65 Z"
        fill={`url(#${goldMainId})`}
      />

      {/* ── 3. Intertwined Royal Serif 'A' and 'B' Monogram ──────────── */}
      {/* Left Vine Sprig along stem of 'A' */}
      <path
        d="M74 135 C72 118 78 102 85 86 C88 80 94 72 101 62"
        stroke={`url(#${goldLightId})`}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Little leaf on left 'A' stem */}
      <path
        d="M76 112 C69 110 65 116 68 122 C74 121 77 116 76 112 Z"
        fill={`url(#${goldMainId})`}
      />

      {/* Main 'A' Left Stem & Serif */}
      <path
        d="M74 140 L101 54 C103 49 109 49 111 54 L130 102"
        stroke={`url(#${goldMainId})`}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left Serif Base Foot on 'A' */}
      <path
        d="M65 140 C72 136 86 140 91 140"
        stroke={`url(#${goldLightId})`}
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Crossbar of 'A' */}
      <path
        d="M84 112 L124 112"
        stroke={`url(#${goldShimmerId})`}
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Royal 'B' Structure Intertwining with 'A' */}
      {/* 'B' Spine */}
      <path
        d="M109 57 L109 135"
        stroke={`url(#${goldMainId})`}
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      {/* Top Arc of 'B' */}
      <path
        d="M109 58 C138 55 160 67 155 85 C151 98 135 102 118 102"
        stroke={`url(#${goldLightId})`}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom Arc of 'B' */}
      <path
        d="M118 102 C142 102 163 111 159 128 C154 144 131 144 107 144"
        stroke={`url(#${goldMainId})`}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── 4. Lower Base Walnut Kernel Motif ───────────────────────── */}
      {/* Outer Walnut Shell Contour with transparent fill to prevent dark patch on ivory */}
      <ellipse
        cx="110"
        cy="158"
        rx="20"
        ry="23"
        stroke={`url(#${goldMainId})`}
        strokeWidth="4"
        fill="transparent"
      />
      {/* Walnut Kernel Symmetrical Inner Lobes */}
      <path
        d="M110 139 C104 146 103 154 110 162 C110 170 105 177 110 181 M110 139 C116 146 117 154 110 162 C110 170 115 177 110 181"
        stroke={`url(#${goldLightId})`}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M100 151 C97 157 99 166 103 169 M120 151 C123 157 121 166 117 169"
        stroke={`url(#${goldShimmerId})`}
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* ── 5. Ornate Base Acanthus & Laurel Leaf Scrolls ───────────── */}
      {/* Left Base Scrolls */}
      <path
        d="M88 168 C74 171 61 162 54 153 C61 150 76 155 83 162 Z"
        fill={`url(#${goldMainId})`}
      />
      <path
        d="M90 178 C72 187 56 181 45 172 C56 169 74 173 85 173 Z"
        fill={`url(#${goldLightId})`}
      />
      <path
        d="M97 188 C83 197 70 194 61 188 C72 185 85 186 92 184 Z"
        fill={`url(#${goldMainId})`}
      />

      {/* Right Base Scrolls */}
      <path
        d="M132 168 C146 171 159 162 166 153 C159 150 144 155 137 162 Z"
        fill={`url(#${goldMainId})`}
      />
      <path
        d="M130 178 C148 187 164 181 175 172 C164 169 146 173 135 173 Z"
        fill={`url(#${goldLightId})`}
      />
      <path
        d="M123 188 C137 197 150 194 159 188 C148 185 135 186 128 184 Z"
        fill={`url(#${goldMainId})`}
      />
    </svg>
  );
}

/**
 * Top-Left Header Brand Lockup
 * Clean, unconstrained luxury brand logo (Gold Crest + Serif "AllBarka" + Boutique Subtitle)
 */
export function AllBarkaHeaderLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 sm:gap-3.5 cursor-pointer shrink-0 group select-none ${className}`}>
      {/* Standalone Artistic Botanical Gold Crest */}
      <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        <AllBarkaCrestVector />
      </div>

      {/* Typography Brand Block */}
      <div className="block text-left">
        <span className="text-lg sm:text-[1.65rem] font-serif font-bold tracking-[0.035em] text-[#042821] dark:text-[#FFFCF7] leading-none block transition-colors">
          AllBarka
        </span>
        <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1">
          <span className="text-[7.5px] sm:text-[8.5px] font-sans font-semibold uppercase tracking-[0.22em] block leading-none text-[#806326] dark:text-[#C7982F] whitespace-nowrap">
            PREMIUM DRY FRUITS
          </span>
          <span className="text-[7px] text-[#C7982F]/70 leading-none">·</span>
          <span className="text-[7.5px] sm:text-[8px] font-sans font-semibold uppercase tracking-[0.16em] text-[#806326] dark:text-[#C7982F]/90 leading-none whitespace-nowrap">
            PAKISTAN
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Full Complete Custom Brand Logo for Hero Banner, Modals & Footer
 * Botanical Monogram + AllBarka + PREMIUM DRY FRUITS BOUTIQUE + LAHORE + Star Ornament
 */
export function AllBarkaFullLogo({ 
  className = '', 
  variant = 'dark',
  size = 'lg',
  as: Component = 'span'
}: LogoProps) {
  const isDarkSurface = variant === 'light' || variant === 'on-dark';
  const isGold = variant === 'gold';

  const sizeClasses = {
    sm: {
      crest: 'w-12 h-12',
      title: 'text-2xl',
      sub: 'text-[8.5px] tracking-[0.26em]',
      city: 'text-[8px] tracking-[0.24em]',
      divider: 'max-w-[180px]',
      star: 'text-[8px]'
    },
    md: {
      crest: 'w-16 h-16 sm:w-20 sm:h-20',
      title: 'text-3xl sm:text-4xl',
      sub: 'text-[9.5px] sm:text-[10.5px] tracking-[0.3em]',
      city: 'text-[9px] sm:text-[10px] tracking-[0.26em]',
      divider: 'max-w-[240px]',
      star: 'text-[9px]'
    },
    lg: {
      crest: 'w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32',
      title: 'text-4xl sm:text-5xl md:text-6xl',
      sub: 'text-[10.5px] sm:text-xs md:text-sm tracking-[0.32em]',
      city: 'text-[10px] sm:text-xs tracking-[0.28em]',
      divider: 'max-w-[280px] sm:max-w-[340px]',
      star: 'text-[10px] sm:text-xs'
    },
    xl: {
      crest: 'w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40',
      title: 'text-5xl sm:text-6xl md:text-7xl',
      sub: 'text-xs sm:text-sm md:text-base tracking-[0.34em]',
      city: 'text-xs sm:text-sm tracking-[0.3em]',
      divider: 'max-w-[320px] sm:max-w-[400px]',
      star: 'text-sm'
    }
  }[size];

  // Surface-aware typography styling
  const titleClass = isDarkSurface
    ? 'text-[#FFFCF7] drop-shadow-sm' // Explicit ivory on dark/emerald hero, NEVER charcoal!
    : isGold
    ? 'text-[#806326] dark:text-[#D4A843]'
    : 'text-[#042821] dark:text-[#FFFCF7]'; // Emerald on light ivory, ivory on dark surface

  const subClass = isDarkSurface
    ? 'text-[#E4C783]' // Readable warm gold on dark emerald
    : isGold
    ? 'text-[#806326] dark:text-[#E4C783]'
    : 'text-[#806326] dark:text-[#E4C783]'; // Dark bronze on light ivory (4.6+:1)

  const cityClass = isDarkSurface
    ? 'text-[#E4C783]'
    : 'text-[#806326] dark:text-[#E4C783]';

  const dividerGradient = isDarkSurface
    ? 'from-transparent via-[#D4A843]/60 to-[#D4A843]'
    : 'from-transparent via-[#806326]/40 to-[#806326]/60 dark:via-[#D4A843]/60 dark:to-[#D4A843]';

  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      {/* 1. Large Artistic Gold Monogram Crest */}
      <div className={`${sizeClasses.crest} mb-3 sm:mb-4 flex items-center justify-center transition-transform duration-500 hover:scale-105`}>
        <AllBarkaCrestVector />
      </div>

      {/* 2. Brand Name Serif Wordmark (Component defaults to span so it does not conflict with page H1) */}
      <Component className={`font-serif font-black ${sizeClasses.title} tracking-[0.035em] leading-none block ${titleClass}`}>
        AllBarka
      </Component>

      {/* 3. Sub-headline: PREMIUM DRY FRUITS BOUTIQUE */}
      <p className={`font-black uppercase ${sizeClasses.sub} mt-2 sm:mt-3 leading-none ${subClass}`}>
        PREMIUM DRY FRUITS BOUTIQUE
      </p>

      {/* 4. Symmetrical City Rule: — • LAHORE • — */}
      <div className={`flex items-center justify-center gap-2.5 sm:gap-3.5 mt-2.5 sm:mt-3 w-full ${sizeClasses.divider}`}>
        <div className={`h-[1px] flex-1 bg-gradient-to-r ${dividerGradient}`} />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#D4A843]" />
          <span className={`font-black uppercase ${sizeClasses.city} ${cityClass} leading-none whitespace-nowrap`}>
            PAKISTAN
          </span>
          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#D4A843]" />
        </div>
        <div className={`h-[1px] flex-1 bg-gradient-to-l ${dividerGradient}`} />
      </div>

      {/* 5. Micro Gold Star / Diamond */}
      <div className={`flex items-center justify-center gap-1 mt-2 text-[#D4A843] ${sizeClasses.star}`} aria-hidden="true">
        <span>✦</span>
      </div>
    </div>
  );
}

export default AllBarkaFullLogo;

