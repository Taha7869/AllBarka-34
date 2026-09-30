import React, { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';

// ─── Edit stats here ─────────────────────────────────────────────────────────
interface StatConfig {
  /** Translation key for the label (en/ur/ar must all have this key) */
  labelKey: string;
  /** Final number to count up to */
  value: number;
  /** Suffix displayed after the number (e.g. "+", "k+") */
  suffix: string;
  /** Duration of the count-up animation in ms */
  duration: number;
}

const STATS: StatConfig[] = [
  { labelKey: 'stats.customers',  value: 5000,  suffix: '+',  duration: 1800 },
  { labelKey: 'stats.products',   value: 60,    suffix: '+',  duration: 1400 },
  { labelKey: 'stats.cities',     value: 12,    suffix: '+',  duration: 1200 },
  { labelKey: 'stats.years',      value: 8,     suffix: '',   duration: 1000 },
];
// ─────────────────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration: number, active: boolean, reduced: boolean) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || reduced) {
      setCount(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, target, duration, reduced]);

  return count;
}

function StatItem({ stat, active }: { stat: StatConfig; active: boolean }) {
  const { t } = useLanguage();
  const reduced = useReducedMotion() ?? false;
  const count = useCountUp(stat.value, stat.duration, active, reduced);

  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 text-center">
      <span
        className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[var(--color-accent,#C7982F)]"
        aria-live={active ? 'polite' : 'off'}
      >
        <bdi dir="ltr">{count.toLocaleString()}{stat.suffix}</bdi>
      </span>
      <span className="text-xs sm:text-sm font-medium uppercase tracking-widest text-[var(--color-text-secondary)]">
        {t(stat.labelKey, stat.labelKey)}
      </span>
    </div>
  );
}

/**
 * CountUpStats — animated counter strip triggered once on scroll-into-view.
 * Numbers configured via STATS array at the top of this file.
 * Fully translated (en/ur/ar) via t() + LanguageContext.
 * prefers-reduced-motion: jumps directly to final value.
 */
export default function CountUpStats() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      aria-label="Key statistics"
      className="w-full bg-[var(--color-emerald,#1E3A2B)] border-y border-[#C7982F]/20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Divider ornament above */}
        <div className="section-divider" aria-hidden="true" />

        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#C7982F]/20 divide-y md:divide-y-0 divide-[#C7982F]/20">
          {STATS.map((stat) => (
            <StatItem key={stat.labelKey} stat={stat} active={isInView} />
          ))}
        </div>

        {/* Divider ornament below */}
        <div className="section-divider" aria-hidden="true" />
      </div>
    </section>
  );
}
