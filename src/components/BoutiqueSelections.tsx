import { usePrefersReducedMotion as useReducedMotion } from '../hooks/usePrefersReducedMotion';
import React, { useState, useEffect, useCallback, useRef, useId, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, ArrowRight, Sparkles } from 'lucide-react';

import type { Product, MerchandisingSettings } from '../types';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useMerchandisingSettings } from '../contexts/MerchandisingContext';
import { DEFAULT_MERCHANDISING } from '../config/merchandising';
import ProductCard from './ProductCard';

export interface BoutiqueSelectionsProps {
  settings?: MerchandisingSettings;
  products?: Product[];
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
  products: propProducts,
  onAddToCart,
  onQuickView,
}: BoutiqueSelectionsProps) {
  const { t, language, isRtl } = useLanguage();
  const catalogProducts = useCatalogProducts();
  const PRODUCTS = propProducts || catalogProducts;
  const contextSettings = useMerchandisingSettings();
  const activeSettings = propSettings || contextSettings || DEFAULT_MERCHANDISING;

  const prefersReduced = Boolean(useReducedMotion());
  const componentId = useId();

  // 1. Resolve tabs and products from authoritative catalog
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
            (prod as any).status !== 'draft' &&
            (prod as any).inStock !== false &&
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

  // 2. Initial valid tab: Dry Fruits & Nuts first if available, else first valid tab
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

  // 3. Autoplay timing configuration
  const intervalMs =
    activeSettings.autoplay?.intervalMs ??
    activeSettings.autoplayDurationMs ??
    6000;
  const resumeDelayMs =
    activeSettings.autoplay?.resumeDelayMs ??
    activeSettings.autoplayResumeDelayMs ??
    3000;

  // 4. Autoplay state machine:
  // - userPlayOverride: null (use default) | true (explicit play) | false (explicit pause)
  // - isInteracted: manual tab select, keyboard focus, touch swipe, product click pauses until explicit Play
  // - isHovered: pointer hover pauses throughout; Play while hovered does not falsify hover state!
  // - isResumePending: true during 3000ms delay after pointer exit
  // - isDocumentVisible: reactive document visibility state
  const [userPlayOverride, setUserPlayOverride] = useState<boolean | null>(null);
  const [isInteracted, setIsInteracted] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isResumePending, setIsResumePending] = useState<boolean>(false);

  // Document visibility state
  const [isDocumentVisible, setIsDocumentVisible] = useState<boolean>(() =>
    typeof document === 'undefined' ? true : !document.hidden
  );

  const autoplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Separated timer cleanups
  const clearAutoplayTimer = useCallback(() => {
    if (autoplayTimerRef.current) {
      clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, []);

  const clearHoverResumeTimer = useCallback(() => {
    if (hoverResumeTimerRef.current) {
      clearTimeout(hoverResumeTimerRef.current);
      hoverResumeTimerRef.current = null;
    }
  }, []);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      clearAutoplayTimer();
      clearHoverResumeTimer();
    };
  }, [clearAutoplayTimer, clearHoverResumeTimer]);

  // Autoplay eligibility logic
  const isRotationPossible = resolvedTabs.length > 1;
  const adminAutoplayEnabled = activeSettings.autoplay?.enabled !== false;
  const isEffectivelyPlaying =
    userPlayOverride !== null
      ? userPlayOverride
      : (!prefersReduced && adminAutoplayEnabled);

  // Is showcase actively in playing state for UI disclosure
  const isShowcasePlaying =
    isRotationPossible &&
    isEffectivelyPlaying &&
    !isInteracted;

  // Can the countdown timer actually run right now?
  const canAutoplayRun =
    isShowcasePlaying &&
    !isHovered &&
    !isResumePending &&
    isDocumentVisible;

  // Cycle to next tab
  const advanceToNextTab = useCallback(() => {
    if (resolvedTabs.length <= 1) return;
    setSelectedTabId(currentId => {
      const idx = resolvedTabs.findIndex(t => t.id === currentId);
      const nextIdx = (idx + 1) % resolvedTabs.length;
      return resolvedTabs[nextIdx].id;
    });
  }, [resolvedTabs]);

  // Document visibility listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsDocumentVisible(visible);
      if (!visible) {
        // Tab hidden: cancel countdown and resume delay immediately
        clearAutoplayTimer();
        clearHoverResumeTimer();
        setIsResumePending(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearAutoplayTimer, clearHoverResumeTimer]);

  // Pointer hover handlers
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    // Cancel pending resume timer immediately
    clearHoverResumeTimer();
    setIsResumePending(false);
    // Cancel running rotation countdown
    clearAutoplayTimer();
  }, [clearHoverResumeTimer, clearAutoplayTimer]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (!isEffectivelyPlaying || isInteracted || !isRotationPossible || !isDocumentVisible) {
      return;
    }

    // Start the hover resume delay
    clearHoverResumeTimer();
    setIsResumePending(true);
    hoverResumeTimerRef.current = setTimeout(() => {
      setIsResumePending(false);
      hoverResumeTimerRef.current = null;
    }, resumeDelayMs);
  }, [
    isEffectivelyPlaying,
    isInteracted,
    isRotationPossible,
    isDocumentVisible,
    resumeDelayMs,
    clearHoverResumeTimer,
  ]);

  // Manual interaction handler (tab selection, focus, touch swipe, card click)
  const handleManualInteraction = useCallback(() => {
    setIsInteracted(true);
    clearAutoplayTimer();
    clearHoverResumeTimer();
    setIsResumePending(false);
  }, [clearAutoplayTimer, clearHoverResumeTimer]);

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
    if (isShowcasePlaying) {
      // User explicitly pauses
      setUserPlayOverride(false);
      setIsInteracted(true);
      clearAutoplayTimer();
      clearHoverResumeTimer();
      setIsResumePending(false);
    } else {
      // User explicitly plays
      setUserPlayOverride(true);
      setIsInteracted(false);
      setIsResumePending(false);
      clearHoverResumeTimer();
      // CRITICAL: DO NOT falsify isHovered!
      // If pointer is hovering over the component or button, isHovered stays true,
      // keeping the entire hover duration protected until pointer exits.
    }
  }, [isShowcasePlaying, clearAutoplayTimer, clearHoverResumeTimer]);

  // Dedicated Autoplay countdown effect
  // Note: ONLY owns autoplayTimerRef; NEVER touches hoverResumeTimerRef!
  useEffect(() => {
    clearAutoplayTimer();

    if (!canAutoplayRun) return;

    autoplayTimerRef.current = setTimeout(() => {
      advanceToNextTab();
    }, intervalMs);

    return () => {
      clearAutoplayTimer();
    };
  }, [
    canAutoplayRun,
    intervalMs,
    selectedTabId,
    advanceToNextTab,
    clearAutoplayTimer,
  ]);

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
      data-interval={intervalMs}
      data-resume-delay={resumeDelayMs}
      aria-label={t('boutique.showcaseTitle', 'Boutique Selections')}
      dir={isRtl ? 'rtl' : 'ltr'}
      className="boutique-selections w-full border-y border-[var(--color-border)] bg-[var(--color-surface)] py-12 sm:py-16 lg:py-20 text-[var(--color-ink)]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleManualInteraction}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header: Eyebrow, Title, Subtitle, and Autoplay Toggle */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between text-start">
          <div className="max-w-2xl">
            <div className="mb-2.5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--color-accent-text)]">
              <Sparkles size={13} aria-hidden="true" />
              <span>{t('boutique.showcaseEyebrow', 'Single Sourced & Hand Picked')}</span>
            </div>
            <h2 className="font-serif text-3xl font-medium break-words [overflow-wrap:anywhere] tracking-tight text-[var(--color-ink)] sm:text-4xl lg:text-[42px] leading-tight">
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
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3 self-start sm:self-end">
            <button
              type="button"
              onClick={handleTogglePlayPause}
              disabled={!isRotationPossible}
              aria-label={
                isShowcasePlaying
                  ? t('boutique.pauseShowcase', 'Pause showcase autoplay')
                  : t('boutique.playShowcase', 'Play showcase autoplay')
              }
              aria-pressed={isShowcasePlaying}
              className={`focus-ring inline-flex max-w-full min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-base)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[#C7982F] hover:text-[var(--color-accent-text)] ${
                !isRotationPossible ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isShowcasePlaying ? (
                <>
                  <Pause size={13} className="text-[var(--color-accent-text)]" aria-hidden="true" />
                  <span>{t('boutique.pause', 'Pause')}</span>
                </>
              ) : (
                <>
                  <Play size={13} className="text-[var(--color-accent-text)]" aria-hidden="true" />
                  <span>{t('boutique.play', 'Play')}</span>
                </>
              )}
            </button>

            <Link
              to={currentTab.destination}
              className="focus-ring inline-flex max-w-full min-h-11 items-center gap-2 rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-text)] transition-colors hover:text-[#092E23] dark:hover:text-[#F6F1EA]"
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
          onFocusCapture={handleManualInteraction}
          className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-none"
        >
          {resolvedTabs.map(tab => {
            const isActive = tab.id === selectedTabId;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`boutique-tab-${componentId}-${tab.id}`}
                data-tab-id={tab.id}
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
          className="w-full min-h-[460px] transition-opacity duration-300 motion-reduce:transition-none"
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
