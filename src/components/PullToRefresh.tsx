import { useEffect, useRef, useState } from 'react';
import AlmondLoader from './AlmondLoader';
import { useLanguage } from '../contexts/LanguageContext';

const THRESHOLD = 72;
const MAX = 110;
const copy = {
  en: { pull: 'Pull to refresh', release: 'Release to refresh', busy: 'Refreshing' },
  ur: { pull: 'تازہ کرنے کے لیے نیچے کھینچیں', release: 'تازہ کرنے کے لیے چھوڑیں', busy: 'تازہ ہو رہا ہے' },
  ar: { pull: 'اسحب للتحديث', release: 'أفلت للتحديث', busy: 'جارٍ التحديث' },
};

/**
 * Phone pull-to-refresh with the AllBarka almond in place of the browser's grey circle.
 * Works only at the very top of the page, never while a drawer or dialog has locked scrolling,
 * and the browser's own pull-to-refresh is turned off by CSS on touch screens so the two never stack.
 */
export default function PullToRefresh({ disabled = false }: { disabled?: boolean }) {
  const { language } = useLanguage();
  const [distance, setDistance] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [base, setBase] = useState(0);
  const live = useRef(0);

  useEffect(() => {
    if (disabled || busy) return;
    const locked = () => document.body.style.overflow === 'hidden' || document.documentElement.style.overflow === 'hidden';
    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || window.scrollY > 0 || locked()) { start.current = null; return; }
      start.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      // Slide out from under the sticky header, not behind it.
      setBase(Math.max(0, Math.round(document.getElementById('main-navigation-header')?.getBoundingClientRect().bottom || 0)));
    };
    const onMove = (event: TouchEvent) => {
      if (!start.current) return;
      const dy = event.touches[0].clientY - start.current.y;
      const dx = Math.abs(event.touches[0].clientX - start.current.x);
      if (dy <= 0 || dx > dy || window.scrollY > 0) { live.current = 0; setDistance(0); return; }
      live.current = Math.min(MAX, dy * 0.5);
      setDistance(live.current);
    };
    const onEnd = () => {
      if (!start.current) return;
      start.current = null;
      if (live.current >= THRESHOLD) {
        setBusy(true); setDistance(THRESHOLD);
        window.setTimeout(() => window.location.reload(), 350);
      } else setDistance(0);
      live.current = 0;
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [disabled, busy]);

  if (distance <= 4 && !busy) return null;
  const ready = distance >= THRESHOLD;
  const words = copy[language];
  return <div data-pull-to-refresh className="pointer-events-none fixed inset-x-0 top-0 z-[110] flex justify-center" style={{ transform: `translateY(${base + Math.round(distance * 0.6) - 12}px)`, opacity: Math.min(1, distance / 40) }} aria-live="polite">
    <div className="flex items-center gap-2 rounded-full border border-[#C7982F]/35 bg-[var(--color-surface,#FFFCF7)] px-3 py-1.5 shadow-md dark:bg-[#1A201E]">
      <AlmondLoader size={26} progress={busy ? undefined : distance / THRESHOLD} spinning={busy} />
      <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">{busy ? words.busy : ready ? words.release : words.pull}</span>
    </div>
  </div>;
}
