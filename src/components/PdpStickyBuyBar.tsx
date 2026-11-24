import { useEffect, useState, type RefObject } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { setPdpBuyBarVisible } from '../lib/pdpBuyBarSignal';

interface Props {
  /** The main purchase block; the bar shows only after it has scrolled above the screen. */
  targetRef: RefObject<HTMLElement | null>;
  name: string;
  portion: string;
  totalText: string;
  disabled: boolean;
  onAdd: () => void;
}

const MOBILE = '(max-width: 767px)';

/** Phone-only bar that keeps the price and Add to bag in reach while the customer reads the details. */
export default function PdpStickyBuyBar({ targetRef, name, portion, totalText, disabled, onAdd }: Props) {
  const { t, language } = useLanguage();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target || typeof IntersectionObserver === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(MOBILE);
    let passed = false;
    const update = () => setShow(media.matches && passed);
    const syncPosition = () => {
      passed = target.getBoundingClientRect().bottom <= 0;
      update();
    };
    const observer = new IntersectionObserver(([entry]) => {
      passed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      update();
    });
    observer.observe(target);
    window.addEventListener('scroll', syncPosition, { passive: true });
    media.addEventListener?.('change', update);
    return () => { observer.disconnect(); window.removeEventListener('scroll', syncPosition); media.removeEventListener?.('change', update); setShow(false); };
  }, [targetRef]);

  useEffect(() => { setPdpBuyBarVisible(show); }, [show]);
  useEffect(() => () => setPdpBuyBarVisible(false), []);

  if (!show) return null;
  return <div data-pdp-buy-bar className="pdp-buy-bar fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface,#FFFCF7)] px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(4,40,33,0.08)] dark:bg-[#1A201E] md:hidden" dir={language === 'en' ? 'ltr' : 'rtl'}>
    <div className="mx-auto flex max-w-xl items-center gap-3">
      <div className="min-w-0 flex-1 text-start">
        <p lang={language} className="truncate text-xs font-semibold text-[var(--color-text-primary)]">{name}</p>
        <p className="text-[11px] text-[var(--color-text-secondary)]"><bdi dir="auto">{portion}</bdi> · <bdi dir="ltr" className="font-semibold text-[var(--color-text-primary)]">{totalText}</bdi></p>
      </div>
      <button type="button" onClick={onAdd} disabled={disabled}
        className="focus-ring inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--color-primary,#042821)] px-4 text-xs font-bold text-white disabled:opacity-50">
        <ShoppingBag size={15} aria-hidden="true" />
        {t('addToCart', 'Add to Cart')}
      </button>
    </div>
  </div>;
}
