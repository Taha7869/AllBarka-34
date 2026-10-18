import React, { useState, useEffect, useCallback, useRef, useId, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, ArrowRight, Sparkles } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import type { Product, MerchandisingSettings } from '../types';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';
import { DEFAULT_MERCHANDISING } from '../config/merchandising';
import ProductCard from './ProductCard';
import { apiUrl } from '../lib/apiUrl';

interface BoutiqueSelectionsProps {
  settings?: MerchandisingSettings;
  onAddToCart?: (productId: string, weight: string) => void;
  onQuickView?: (product: Product) => void;
}

interface ShowcaseTabResolved {
  id: string;
  label: string;
  destination: string;
  products: Product[];
}

const TAB_DESTINATIONS: Record<string, string> = {
  'dry-fruits': '/shop/dry-fruits',
  pantry: '/shop/essentials',
  gifts: '/gifting',
  'celebration-boxes': '/shop/celebration-boxes',
  deals: '/shop/deals',
};

export default function BoutiqueSelections({
  settings: propSettings,
  onAddToCart,
  onQuickView,
}: BoutiqueSelectionsProps) {
  const { t, language, isRtl } = useLanguage();
  const PRODUCTS = useCatalogProducts();
  const prefersReduced = Boolean(useReducedMotion());
  const componentId = useId();

  // 1. Merchandising settings: prop > fetched state > DEFAULT_MERCHANDISING
  const [activeSettings, setActiveSettings] = useState<MerchandisingSettings>(
    propSettings || DEFAULT_MERCHANDISING
  );

  useEffect(() => {
    if (propSettings) {
      setActiveSettings(propSettings);
      return;
    }
    let cancelled = false;
    const fetchMerchandising = async () => {
      try {
        const res = await fetch(apiUrl('/api/merchandising'), {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.settings && Array.isArray(data.settings.showcaseTabs)) {
          setActiveSettings(data.settings);
        }
      } catch {
        // Fallback remains DEFAULT_MERCHANDISING
      }
    };
    void fetchMerchandising();
    return () => {
      cancelled = true;
    };
  }, [propSettings]);

  // 2. Resolve tabs and products from authoritative catalog
  // - Skip inactive/unpublished products
  // - Never duplicate products to fill slots
  // - Limit to 3 admin-selected products per tab
  // - Hide empty tabs
  const resolvedTabs: ShowcaseTabResolved[] = useMemo(() => {
    const rawTabs = activeSettings.showcaseTabs || DEFAULT_MERCHANDISING.showcaseTabs;
    const catalogMap = new Map(PRODUCTS.map(p => [p.id, p]));

    return rawTabs
      .filter(tab => tab.visible !== false)
      .map(tab => {
        const seenIds = new Set<string>();
        const validProducts: Product[] = [];
        for (const pid of tab.productIds || []) {
          const prod = catalogMap.get(pid);
          if (
            prod &&
            prod.active !== false &&
            (prod as any).status !== 'archived' &&
            !seenIds.has(prod.id)
          ) {
            seenIds.add(prod.id);
            validProducts.push(prod);
            if (validProducts.length === 3) break; // Maximum 3 admin-selected products per tab
          }
        }

        const label =
          language === 'ur'
            ? tab.label_ur || tab.label_en
            : language === 'ar'
            ? (tab as any).label_ar || tab.label_en
            : tab.label_en;

        const destination = TAB_DESTINATIONS[tab.id] || `/shop/${tab.id}`;

        return {
          id: tab.id,
          label,
          destination,
          products: validProducts,
        };
      })
      .filter(tab => tab.products.length > 0);
  }, [activeSettings, PRODUCTS, language]);

  // 3. Initial valid tab: Dry Fruits & Nuts first if available, else first valid tab
  const [selectedTabId, setSelectedTabId] = useState<string>(() => {
    const dryFruits = resolvedTabs.find(t => t.id === 'dry-fruits');
    return dryFruits ? dryFruits.id : (resolvedTabs[0]?.id || 'dry-fruits');
  });

  // Ensure selected tab remains valid if tabs change
  useEffect(() => {
    if (resolvedTabs.length > 0 && !resolvedTabs.some(t => t.id === selectedTabId)) {
      const dryFruits = resolvedTabs.find(t => t.id === 'dry-fruits');
      setSelectedTabId(dryFruits ? dryFruits.id : resolvedTabs[0].id);
    }
  }, [resolvedTabs, selectedTabId]);

  // Active tab object
  const currentTab = useMemo(
    () => resolvedTabs.find(t => t.id === selectedTabId) || resolvedTabs[0] || null,
    [resolvedTabs, selectedTabId]
  );

  // 4. Autoplay timing configuration
  const intervalMs =
    activeSettings.autoplay?.intervalMs ??
    activeSettings.autoplayDurationMs ??
    6000;
  const resumeDelayMs =
    activeSettings.autoplay?.resumeDelayMs ??
    activeSettings.autoplayResumeDelayMs ??
    3000;

  // 5. Autoplay state machine:
  // - prefers-reduced-motion defaults autoplay off
  // - isPlaying: explicit user play/pause state
  // - isInteracted: manual tab select, keyboard focus, touch swipe, product click pauses until explicit Play
  // - isHovered: pointer hover pauses throughout
  // - hoverResumeTimeout: 3000ms delay after pointer exit before resuming
  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    if (prefersReduced) return false;
    return activeSettings.autoplay?.enabled !== false;
  });
  const [isInteracted, setIsInteracted] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isResumePending, setIsResumePending] = useState<boolean>(false);

  const hoverResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTablistFocusedRef = useRef<boolean>(false);

  // Clear timers helper
  const clearAllTimers = useCallback(() => {
    if (autoplayTimerRef.current) {
      clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    if (hoverResumeTimerRef.current) {
      clearTimeout(hoverResumeTimerRef.current);
      hoverResumeTimerRef.current = null;
    }
  }, []);

  // Cycle to next tab
  const advanceToNextTab = useCallback(() => {
    if (resolvedTabs.length <= 1) return;
    setSelectedTabId(currentId => {
      const idx = resolvedTabs.findIndex(t => t.id === currentId);
      const nextIdx = (idx + 1) % resolvedTabs.length;
      return resolvedTabs[nextIdx].id;
    });
  }, [resolvedTabs]);

  // Pointer hover handlers
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setIsResumePending(false);
    if (hoverResumeTimerRef.current) {
      clearTimeout(hoverResumeTimerRef.current);
      hoverResumeTimerRef.current = null;
    }
    if (autoplayTimerRef.current) {
      clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (!isPlaying || isInteracted) return;

    // Wait 3000ms after pointer exit before starting autoplay interval
    setIsResumePending(true);
    if (hoverResumeTimerRef.current) clearTimeout(hoverResumeTimerRef.current);
    hoverResumeTimerRef.current = setTimeout(() => {
      setIsResumePending(false);
      hoverResumeTimerRef.current = null;
    }, resumeDelayMs);
  }, [isPlaying, isInteracted, resumeDelayMs]);

  // Manual interaction handler (tab selection, focus, touch swipe, card click)
  const handleManualInteraction = useCallback(() => {
    setIsInteracted(true);
    clearAllTimers();
  }, [clearAllTimers]);

  // Tab click
  const handleSelectTab = useCallback(
    (tabId: string) => {
      handleManualInteraction();
      setSelectedTabId(tabId);
    },
    [handleManualInteraction]
  );

  // Explicit Play / Pause toggle
  const handleTogglePlayPause = useCallback(() => {
    if (isPlaying && !isInteracted) {
      // User pauses
      setIsPlaying(false);
      clearAllTimers();
    } else {
      // User explicitly plays: clears manual interaction pause and starts playing
      setIsInteracted(false);
      setIsPlaying(true);
      setIsHovered(false);
      setIsResumePending(false);
    }
  }, [isPlaying, isInteracted, clearAllTimers]);

  // Autoplay countdown effect
  useEffect(() => {
    clearAllTimers();

    const canAutoplay =
      isPlaying &&
      !isInteracted &&
      !isHovered &&
      !isResumePending &&
      !prefersReduced &&
      resolvedTabs.length > 1;

    if (!canAutoplay) return;

    autoplayTimerRef.current = setTimeout(() => {
      advanceToNextTab();
    }, intervalMs);

    return () => {
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
    };
  }, [
    isPlaying,
    isInteracted,
    isHovered,
    isResumePending,
    prefersReduced,
    selectedTabId,
    resolvedTabs,
    intervalMs,
    advanceToNextTab,
    clearAllTimers,
  ]);

  // Document visibility change listener
  // Pause on document.hidden; do not immediately advance on return!
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearAllTimers();
      } else {
        // Returned to tab: do NOT immediately advance!
        // Reset timers so interval starts fresh
        clearAllTimers();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // Keyboard navigation for tablist (Arrow keys, Home, End)
  const handleTablistKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs = resolvedTabs;
    if (tabs.length === 0) return;
    const currentIndex = tabs.findIndex(t => t.id === selectedTabId);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      event.preventDefault();
      nextIndex = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    const nextTab = tabs[nextIndex];
    if (nextTab) {
      handleManualInteraction();
      setSelectedTabId(nextTab.id);
      const tabButton = document.getElementById(`boutique-tab-${componentId}-${nextTab.id}`);
      tabButton?.focus();
    }
  };

  if (resolvedTabs.length === 0 || !currentTab) {
    return null;
  }

  return (
    <section
      id="boutique-selections"
      aria-label={t('boutique.showcaseTitle', 'Boutique Selections')}
      dir={isRtl ? 'rtl' : 'ltr'}
      className="boutique-selections w-full border-y border-[var(--color-border)] bg-[var(--color-surface)] py-12 sm:py-16 lg:py-20 text-[var(--color-ink)]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleManualInteraction}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header: Eyebrow, Title, Subtitle, and Autoplay Toggle */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between text-left">
          <div className="max-w-2xl">
            <div className="mb-2.5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C7982F]">
              <Sparkles size={13} aria-hidden="true" />
              <span>{t('boutique.showcaseEyebrow', 'Single Sourced & Hand Picked')}</span>
            </div>
            <h2 className="font-serif text-3xl font-medium tracking-tight text-[var(--color-ink)] sm:text-4xl lg:text-[42px] leading-tight">
              {t('boutique.showcaseTitle', 'Boutique Selections')}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {t(
                'boutique.showcaseSubtitle',
                'Hand-selected lots from our premier collections, packaged for your table.'
              )}
            </p>
          </div>

          {/* Autoplay Play/Pause Toggle & View All Link */}
          <div className="flex flex-wrap items-center gap-3 self-start sm:self-end">
            <button
              type="button"
              onClick={handleTogglePlayPause}
              aria-label={
                isPlaying && !isInteracted
                  ? t('boutique.pauseShowcase', 'Pause showcase autoplay')
                  : t('boutique.playShowcase', 'Play showcase autoplay')
              }
              aria-pressed={isPlaying && !isInteracted}
              className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-base)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[#C7982F] hover:text-[#C7982F]"
            >
              {isPlaying && !isInteracted ? (
                <>
                  <Pause size={13} className="text-[#C7982F]" aria-hidden="true" />
                  <span>{t('boutique.pause', 'Pause')}</span>
                </>
              ) : (
                <>
                  <Play size={13} className="text-[#C7982F]" aria-hidden="true" />
                  <span>{t('boutique.play', 'Play')}</span>
                </>
              )}
            </button>

            <Link
              to={currentTab.destination}
              className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#C7982F] transition-colors hover:text-[#092E23] dark:hover:text-[#F6F1EA]"
            >
              <span>{t('boutique.viewCollection', 'View collection')}</span>
              <ArrowRight size={13} className={isRtl ? 'rotate-180' : ''} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Tab Buttons (role="tablist") */}
        <div
          role="tablist"
          aria-label={t('boutique.showcaseTabs', 'Boutique collection tabs')}
          onKeyDown={handleTablistKeyDown}
          onFocusCapture={() => {
            isTablistFocusedRef.current = true;
            handleManualInteraction();
          }}
          onBlurCapture={() => {
            isTablistFocusedRef.current = false;
          }}
          className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-none"
        >
          {resolvedTabs.map(tab => {
            const isActive = tab.id === selectedTabId;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`boutique-tab-${componentId}-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`boutique-panel-${componentId}-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`focus-ring min-h-11 shrink-0 rounded-full border px-5 text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'border-[#092E23] bg-[#092E23] text-[#FFF8E9] shadow-sm dark:border-[#C7982F] dark:bg-[#C7982F] dark:text-[#042821]'
                    : 'border-[var(--color-border)] bg-[var(--color-base)] text-[var(--color-ink)] hover:border-[#C7982F]/70'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Panel: Stable layout dimensions container */}
        <div
          role="tabpanel"
          id={`boutique-panel-${componentId}-${currentTab.id}`}
          aria-labelledby={`boutique-tab-${componentId}-${currentTab.id}`}
          className="w-full min-h-[460px] transition-opacity duration-300"
          tabIndex={0}
          onFocusCapture={handleManualInteraction}
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {currentTab.products.map(product => (
              <div
                key={product.id}
                onClickCapture={handleManualInteraction}
                className="h-full"
              >
                <ProductCard
                  product={product}
                  isWholesale={false}
                  onAddToCart={onAddToCart}
                  onQuickView={onQuickView}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
