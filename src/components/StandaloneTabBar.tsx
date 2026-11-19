import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Store, Gift, ShoppingBag, User } from 'lucide-react';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { isStandaloneDisplayMode } from '../lib/pwa';

interface TabLabels {
  navAria: string;
  home: string;
  shop: string;
  gifting: string;
  bag: string;
  account: string;
}

const LABELS: Record<LanguageCode, TabLabels> = {
  en: {
    navAria: 'App navigation',
    home: 'Home',
    shop: 'Shop',
    gifting: 'Gifting',
    bag: 'Bag',
    account: 'Account',
  },
  ur: {
    navAria: 'ایپ نیویگیشن',
    home: 'ہوم',
    shop: 'شاپ',
    gifting: 'تحائف',
    bag: 'بیگ',
    account: 'اکاؤنٹ',
  },
  ar: {
    navAria: 'تنقل التطبيق',
    home: 'الرئيسية',
    shop: 'المتجر',
    gifting: 'الهدايا',
    bag: 'الحقيبة',
    account: 'الحساب',
  },
};

export function useStandaloneMode(override?: boolean): boolean {
  const [standalone, setStandalone] = useState<boolean>(() =>
    override !== undefined ? override : isStandaloneDisplayMode()
  );

  useEffect(() => {
    if (override !== undefined) {
      setStandalone(override);
      return;
    }
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(display-mode: standalone)');
    const sync = () => setStandalone(isStandaloneDisplayMode());
    sync();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', sync);
      return () => mq.removeEventListener('change', sync);
    }
    return undefined;
  }, [override]);

  return standalone;
}

export interface StandaloneTabBarProps {
  visible?: boolean;
  onOpenAccount: () => void;
  forceStandalone?: boolean;
}

/**
 * Native-like bottom tab bar shown ONLY when AllBarka is launched in installed PWA standalone mode.
 * Coordinates with RootLayout so StickyCartBottomBar hides and AIConcierge/BackToTop shift cleanly above it.
 */
export default function StandaloneTabBar({
  visible = true,
  onOpenAccount,
  forceStandalone,
}: StandaloneTabBarProps) {
  const isStandalone = useStandaloneMode(forceStandalone);
  const { language, isRtl } = useLanguage();
  const { totalItemsCount } = useCart();
  const location = useLocation();

  if (!isStandalone || !visible) return null;

  const labels = LABELS[language] || LABELS.en;
  const path = location.pathname;

  const isHome = path === '/';
  const isShop = path === '/shop' || path.startsWith('/shop/') || path.startsWith('/category/');
  const isGifting = path === '/gifting' || path.startsWith('/occasions') || path.startsWith('/packaging');
  const isBag = path === '/cart';

  const baseTabClass =
    'flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold transition-colors focus-ring';
  const activeClass = 'text-[#1E3A2B] dark:text-[#D8B25C]';
  const inactiveClass = 'text-[#5C554C] hover:text-[#1E3A2B] dark:text-[#A8A199] dark:hover:text-[#FAF9F5]';

  return (
    <nav
      aria-label={labels.navAria}
      data-standalone-tab-bar
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-x-0 bottom-0 z-35 border-t border-[#C7982F]/35 bg-[var(--color-surface,#FFFCF7)]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(4,40,33,0.08)] dark:bg-[#131A18]/95 dark:border-[#C7982F]/30"
    >
      <div className="mx-auto flex max-w-xl items-stretch justify-around px-1">
        <Link
          to="/"
          data-tab="home"
          aria-current={isHome ? 'page' : undefined}
          className={`${baseTabClass} ${isHome ? activeClass : inactiveClass}`}
        >
          <Home size={19} aria-hidden="true" />
          <span>{labels.home}</span>
        </Link>

        <Link
          to="/shop"
          data-tab="shop"
          aria-current={isShop ? 'page' : undefined}
          className={`${baseTabClass} ${isShop ? activeClass : inactiveClass}`}
        >
          <Store size={19} aria-hidden="true" />
          <span>{labels.shop}</span>
        </Link>

        <Link
          to="/gifting"
          data-tab="gifting"
          aria-current={isGifting ? 'page' : undefined}
          className={`${baseTabClass} ${isGifting ? activeClass : inactiveClass}`}
        >
          <Gift size={19} aria-hidden="true" />
          <span>{labels.gifting}</span>
        </Link>

        <Link
          to="/cart"
          data-tab="bag"
          aria-current={isBag ? 'page' : undefined}
          className={`${baseTabClass} relative ${isBag ? activeClass : inactiveClass}`}
        >
          <span className="relative inline-flex">
            <ShoppingBag size={19} aria-hidden="true" />
            {totalItemsCount > 0 && (
              <span
                data-tab-bag-count
                className="absolute -end-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#1E3A2B] px-1 text-[10px] font-bold text-[#FAF9F5] dark:bg-[#C7982F] dark:text-[#111917]"
              >
                {totalItemsCount > 99 ? '99+' : totalItemsCount}
              </span>
            )}
          </span>
          <span>{labels.bag}</span>
        </Link>

        <button
          type="button"
          data-tab="account"
          onClick={onOpenAccount}
          className={`${baseTabClass} ${inactiveClass} bg-transparent border-0 cursor-pointer`}
        >
          <User size={19} aria-hidden="true" />
          <span>{labels.account}</span>
        </button>
      </div>
    </nav>
  );
}
