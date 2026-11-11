import { usePrefersReducedMotion as useReducedMotion } from '../hooks/usePrefersReducedMotion';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import useEmblaCarousel from 'embla-carousel-react';

import { canRotatePantry, pantryCardProjection, pantryRotationDistance } from '../lib/pantryMotion';
import { visibleCardFraction } from '../lib/circularCatalogue';
import { CANONICAL_CATEGORIES, canonicalCollectionKey, getEquivalentCollectionIds } from '../config/categories';
import { PRODUCTS, getProductImage } from '../data/products';
import { useMerchandisingSettings } from '../contexts/MerchandisingContext';
import { DEFAULT_MERCHANDISING } from '../config/merchandising';
import type { MerchandisingSettings } from '../types';

const collectionPresentation = [
  { id: 'all', name: 'All Items', image: '/assets/categories/all_items.png', altKey: 'imageAlt.hero', link: '/shop' },
  { id: 'bundles', name: 'Bundles', image: '/assets/categories/deals.png', altKey: 'imageAlt.categoryDealBoxes', link: '/shop/bundles' },
  { id: 'nuts', name: 'Dry Fruits & Nuts', image: '/assets/categories/dry_fruits.png', altKey: 'imageAlt.categoryDryFruits', link: '/shop/nuts' },
  { id: 'snacks-seeds', name: 'Snacks & Seeds', image: '/assets/categories/snacks.png', altKey: 'imageAlt.categorySnacks', link: '/shop/snacks-seeds' },
  { id: 'gift-boxes', name: 'Gift Boxes', image: '/assets/categories/gifts.png', altKey: 'imageAlt.categoryGifts', link: '/gifting' },
  { id: 'oils', name: 'Cold-Pressed Oils', image: '/images/generated/category-oils-tile-v1.webp', altKey: 'imageAlt.categoryOils', link: '/shop/oils' },
  { id: 'essentials', name: 'Desi Essentials', image: '/images/generated/category-essentials-tile-v1.webp', altKey: 'imageAlt.categoryEssentials', link: '/shop/essentials' },
];
export const PANTRY_CATEGORIES: CarouselSlideItem[] = [
  ...collectionPresentation,
  ...Object.values(CANONICAL_CATEGORIES).filter(category => !collectionPresentation.some(item => item.id === category.id)).map(category => {
    const cover = PRODUCTS.find(product => product.active !== false && product.category === category.id);
    return { id: category.id, name: category.name, image: cover?.image === null ? '' : cover ? getProductImage(cover) : category.id === 'dates' ? '/images/generated/dark-dates-catalog-v1.webp' : '', altKey: `catalog.alt.${category.id}`, link: `/shop/${category.id}` };
  }),
];

const DEFAULT_COLLECTION_IMAGES: Record<string, string> = {
  all: '/assets/categories/all_items.png',
  bundles: '/assets/categories/deals.png',
  combos: '/assets/categories/deals.png',
  nuts: '/assets/categories/dry_fruits.png',
  'dry-fruits': '/assets/categories/dry_fruits.png',
  'snacks-seeds': '/assets/categories/snacks.png',
  'seeds-snacks': '/assets/categories/snacks.png',
  'gift-boxes': '/assets/categories/gifts.png',
  gifts: '/assets/categories/gifts.png',
  oils: '/images/generated/category-oils-tile-v1.webp',
  essentials: '/images/generated/category-essentials-tile-v1.webp',
  'celebration-boxes': '/assets/categories/gifts.png',
  deals: '/assets/categories/deals.png',
  'personalized-treats': '/assets/categories/all_items.png',
};

export interface CategoryCarouselProps {
  settings?: MerchandisingSettings;
}

export interface CarouselSlideItem {
  id: string;
  name: string;
  title?: string;
  image: string;
  link: string;
  altKey: string;
  badge?: string;
}

export default function CategoryCarousel({ settings: propSettings }: CategoryCarouselProps = {}) {
  const { t, language } = useLanguage();
  const contextSettings = useMerchandisingSettings();
  const hasCustomSettings = Boolean(propSettings || (contextSettings && contextSettings !== DEFAULT_MERCHANDISING));
  const activeSettings = propSettings || contextSettings;

  const categories = React.useMemo<CarouselSlideItem[]>(() => {
    if (!hasCustomSettings || !activeSettings) {
      return PANTRY_CATEGORIES;
    }
    const visibility = activeSettings.categoryVisibility || {};
    const order = activeSettings.categoryOrder || [];
    // Safe legacy defaults only where settings.collections is absent, not explicitly empty
    const rawCollections = activeSettings.collections !== undefined
      ? activeSettings.collections
      : DEFAULT_MERCHANDISING.collections;

    // 1. Build normalized lookup for published collections keyed by canonicalCollectionKey
    const normalizedCollections = new Map<string, {
      collectionId: string;
      title_en?: string;
      title_ur?: string;
      image?: string;
      slug?: string;
      visible?: boolean;
      badge?: string;
    }>();

    for (const col of rawCollections) {
      const cKey = canonicalCollectionKey(col.collectionId);
      const existing = normalizedCollections.get(cKey);

      if (!existing) {
        normalizedCollections.set(cKey, { ...col });
      } else {
        // Deterministic conflict resolution:
        // A hidden equivalent must never be resurrected by a conflicting visible alias
        const isHidden = existing.visible === false || col.visible === false;
        const isExplicitlyVisible = existing.visible === true || col.visible === true;
        const resolvedVisibility = isHidden ? false : (isExplicitlyVisible ? true : undefined);

        // Overrides: prefer modern canonical ID, or non-empty overrides
        const preferCol = (col.collectionId === cKey);
        normalizedCollections.set(cKey, {
          collectionId: (col.collectionId === cKey) ? col.collectionId : existing.collectionId,
          title_en: preferCol ? (col.title_en || existing.title_en) : (existing.title_en || col.title_en),
          title_ur: preferCol ? (col.title_ur || existing.title_ur) : (existing.title_ur || col.title_ur),
          image: preferCol ? (col.image || existing.image) : (existing.image || col.image),
          slug: preferCol ? (col.slug || existing.slug) : (existing.slug || col.slug),
          badge: preferCol ? (col.badge || existing.badge) : (existing.badge || col.badge),
          visible: resolvedVisibility,
        });
      }
    }

    const isVisible = (cKey: string) => {
      const col = normalizedCollections.get(cKey);
      if (col?.visible === false) return false;

      // Check all equivalent aliases in categoryVisibility
      const aliases = getEquivalentCollectionIds(cKey);
      for (const alias of aliases) {
        if (visibility[alias] === false) return false;
      }

      return true;
    };

    // 2. Assemble candidate slides
    const slideCandidates: CarouselSlideItem[] = [];
    const seenCanonicalKeys = new Set<string>();

    // A. Start with base pantry categories
    for (const cat of PANTRY_CATEGORIES) {
      const cKey = canonicalCollectionKey(cat.id);
      if (seenCanonicalKeys.has(cKey)) continue;
      seenCanonicalKeys.add(cKey);

      if (!isVisible(cKey)) continue;

      const col = normalizedCollections.get(cKey);
      const colTitle = col
        ? (language === 'ur' ? (col.title_ur || col.title_en) : (col.title_en || col.title_ur))
        : undefined;

      const defaultLink = (cKey === 'dry-fruits') ? '/shop/dry-fruits'
        : (cKey === 'seeds-snacks') ? '/shop/seeds-snacks'
        : cat.link || `/shop/${cat.id}`;

      slideCandidates.push({
        id: col?.collectionId || cat.id,
        name: colTitle || cat.name,
        title: colTitle,
        image: col?.image || cat.image || DEFAULT_COLLECTION_IMAGES[cKey] || DEFAULT_COLLECTION_IMAGES[cat.id] || '',
        link: col?.slug || defaultLink,
        altKey: cat.altKey,
        badge: col?.badge,
      });
    }

    // B. Add any published collections not already present in base pantry categories
    for (const col of rawCollections) {
      const cKey = canonicalCollectionKey(col.collectionId);
      if (seenCanonicalKeys.has(cKey)) continue;
      seenCanonicalKeys.add(cKey);

      if (!isVisible(cKey)) continue;

      const colEntry = normalizedCollections.get(cKey) || col;
      const colTitle = language === 'ur'
        ? (colEntry.title_ur || colEntry.title_en)
        : (colEntry.title_en || colEntry.title_ur);

      slideCandidates.push({
        id: colEntry.collectionId,
        name: colTitle || colEntry.collectionId,
        title: colTitle,
        image: colEntry.image || DEFAULT_COLLECTION_IMAGES[cKey] || DEFAULT_COLLECTION_IMAGES[colEntry.collectionId] || '',
        link: colEntry.slug || `/shop/${colEntry.collectionId}`,
        altKey: `catalog.alt.${colEntry.collectionId}`,
        badge: colEntry.badge,
      });
    }

    // 3. Deterministic Ordering: normalize ordering IDs
    if (!order.length) return slideCandidates;

    const normalizedOrder = order.map(id => canonicalCollectionKey(id));
    const getOrderPos = (id: string) => {
      const cKey = canonicalCollectionKey(id);
      const idx = normalizedOrder.indexOf(cKey);
      return idx !== -1 ? idx : 999;
    };

    return [...slideCandidates].sort((a, b) => {
      const posA = getOrderPos(a.id);
      const posB = getOrderPos(b.id);
      return posA - posB;
    });
  }, [activeSettings, hasCustomSettings, language]);
  const reducedMotion = Boolean(useReducedMotion());
  const sectionRef = useRef<HTMLElement>(null);
  const interactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleIndicesRef = useRef<number[]>([0]);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center', loop: true, containScroll: false, dragFree: true,
    duration: reducedMotion ? 0 : 32,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [visibleIndices, setVisibleIndices] = useState([0]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const rotating = canRotatePantry({ reducedMotion, inView, interacting, hovered, focusWithin, pageVisible });

  const takeControl = useCallback(() => {
    setInteracting(true);
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    // Reading after a swipe is temporary; there is no hidden permanent pause state.
    interactionTimerRef.current = setTimeout(() => setInteracting(false), 8000);
  }, []);
  const scrollPrev = useCallback(() => { takeControl(); emblaApi?.scrollPrev(reducedMotion); }, [emblaApi, reducedMotion, takeControl]);
  const scrollNext = useCallback(() => { takeControl(); emblaApi?.scrollNext(reducedMotion); }, [emblaApi, reducedMotion, takeControl]);

  useEffect(() => () => { if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current); }, []);

  useEffect(() => {
    if (!emblaApi) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= .15), { threshold: .15 });
    observer.observe(emblaApi.rootNode());
    return () => observer.disconnect();
  }, [emblaApi]);

  useEffect(() => {
    if (emblaApi) emblaApi.reInit();
  }, [emblaApi, categories]);

  useEffect(() => {
    const sync = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    let frame = 0;
    const updateCurve = () => {
      frame = 0;
      const viewport = emblaApi.rootNode().getBoundingClientRect();
      if (!viewport.width) return;
      const center = viewport.left + viewport.width / 2;
      const slides = emblaApi.slideNodes();
      const geometry = slides.map(slide => {
        const rect = slide.getBoundingClientRect();
        return {
          position: (rect.left + rect.width / 2 - center) / (viewport.width / 2),
          readable: visibleCardFraction(rect.left, rect.width, viewport.left, viewport.width) >= .78,
        };
      });
      const readableIndices = geometry.flatMap((card, index) => card.readable ? [index] : []);
      // Embla's slidesInView uses isIntersecting, which includes tiny side peeks.
      // Compare actual horizontal coverage, changing React state only at the boundary.
      if (readableIndices.length !== visibleIndicesRef.current.length || readableIndices.some((index, i) => index !== visibleIndicesRef.current[i])) {
        visibleIndicesRef.current = readableIndices;
        setVisibleIndices(readableIndices);
      }
      slides.forEach((slide, index) => {
        const card = slide.firstElementChild as HTMLElement | null;
        if (!card) return;
        const curve = pantryCardProjection(geometry[index].position, reducedMotion);
        card.style.setProperty('--pantry-turn', `${curve.rotation.toFixed(2)}deg`);
        card.style.setProperty('--pantry-rise', `${curve.rise.toFixed(2)}px`);
        card.style.setProperty('--pantry-scale', String(curve.scale));
        card.style.setProperty('--pantry-depth', `${curve.depth.toFixed(2)}px`);
      });
      sectionRef.current?.style.setProperty('--pantry-progress', String(Math.max(0, Math.min(1, emblaApi.scrollProgress()))));
    };
    const scheduleCurve = () => { if (!frame) frame = requestAnimationFrame(updateCurve); };
    const sync = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
      setSelectedIndex(emblaApi.selectedScrollSnap());
      scheduleCurve();
    };
    sync();
    emblaApi.on('select', sync).on('scroll', scheduleCurve).on('reInit', sync).on('resize', scheduleCurve);
    return () => {
      cancelAnimationFrame(frame);
      emblaApi.off('select', sync).off('scroll', scheduleCurve).off('reInit', sync).off('resize', scheduleCurve);
    };
  }, [emblaApi, reducedMotion]);

  useEffect(() => {
    if (!emblaApi || !rotating) return;
    let frame = 0;
    let startedAt = 0;
    let previousTime = 0;
    const advance = (now: number) => {
      if (!startedAt) startedAt = now;
      const elapsed = previousTime ? now - previousTime : 0;
      previousTime = now;
      const engine = emblaApi.internalEngine();
      // Keep one real set of links. Embla recycles the slides at the loop seam,
      // so dragging, arrow navigation and the continuous pace share one position.
      if (!document.hidden && !engine.dragHandler.pointerDown()) {
        engine.scrollBody.useDuration(0);
        engine.scrollTo.distance(pantryRotationDistance(elapsed, now - startedAt), false);
        emblaApi.emit('scroll');
      }
      frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => {
      cancelAnimationFrame(frame);
      emblaApi.internalEngine().scrollBody.useBaseDuration();
    };
  }, [emblaApi, rotating]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); scrollPrev(); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); scrollNext(); }
    else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); takeControl();
      emblaApi?.scrollTo(event.key === 'Home' ? 0 : emblaApi.scrollSnapList().length - 1, reducedMotion);
    }
  };
  // Peeking neighbors stay painted, but clipped links do not enter the tab order.
  const visible = new Set([...visibleIndices, selectedIndex]);

  return (
    <section id="allbarka-pantry" ref={sectionRef} dir="ltr" data-rotating={rotating}
      onFocusCapture={event => setFocusWithin(event.target.matches(':focus-visible'))}
      onKeyDownCapture={() => setFocusWithin(true)}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false); }}
      className="editorial-pantry w-full border-b border-[var(--color-border)] bg-[var(--color-base)] py-12 sm:py-16 select-none">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-5 sm:mb-7 text-left">
          <div className="max-w-xl">
            <span dir="auto" className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-accent-text)]">{t('pantry.eyebrow')}</span>
            <h2 dir="auto" className="font-serif text-3xl font-medium leading-tight tracking-[-.025em] text-[var(--color-ink)] sm:text-4xl text-left">{t('pantry.title')}</h2>
            <p dir="auto" className="mt-3 max-w-lg text-xs leading-7 text-[var(--color-ink-muted)] sm:text-sm text-left">{t('pantry.copy')}</p>
          </div>
          <Link to="/shop" className="focus-ring hidden min-h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--color-gold)]/35 bg-[var(--color-surface)] px-5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-ink)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] sm:inline-flex">
            {t('pantry.explore')} <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="editorial-pantry-stage"
          onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }}
          onPointerLeave={event => { if (event.pointerType === 'mouse') setHovered(false); }}
          onPointerDownCapture={takeControl} onPointerUpCapture={takeControl} onPointerCancelCapture={takeControl}>
          <div className="editorial-pantry-viewport focus-ring cursor-grab active:cursor-grabbing"
            ref={emblaRef} tabIndex={0} onKeyDown={handleKeyDown} role="region" aria-label={t('pantry.region')}>
            <div className="editorial-pantry-track">
              {categories.map((category, index) => (
                <div key={category.id} className="editorial-pantry-slide" aria-hidden={!visible.has(index)} inert={!visible.has(index)}>
                  <Link to={category.link} draggable={false} aria-label={category.title || t(`pantry.${category.id}`, category.name)}
                    className="editorial-category group relative block w-full overflow-hidden border border-[var(--color-border-accent)] bg-[var(--color-surface)] focus-ring hover:border-[#C7982F]/60 pointer-events-auto select-none">
                    <div className="pantry-tile-media absolute inset-0">
                    {category.image ? <img src={category.image} alt={category.title || t(category.altKey, category.name)} draggable={false}
                      onError={event => { const node = event.currentTarget; node.onerror = null; node.src = '/images/product-placeholder.svg'; }}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:transform-none"
                      loading="lazy" decoding="async" /> : <div role="img" aria-label={category.title || category.name} className="absolute inset-0 flex items-center justify-center bg-[#173a2c] font-serif text-3xl text-[#e4c783]">AllBarka</div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-emerald)]/95 via-[var(--color-emerald)]/30 to-transparent pointer-events-none" />
                    {category.badge ? (
                      <span className="pantry-tile-badge absolute left-1/2 top-8 -translate-x-1/2 rounded-full border border-white/25 bg-[#042821]/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#FFFCF7] backdrop-blur-md pointer-events-none z-10">
                        {category.badge}
                      </span>
                    ) : ['all', 'bundles', 'combos', 'deals'].includes(category.id) ? (
                      <span className="pantry-tile-badge absolute left-1/2 top-8 -translate-x-1/2 rounded-full border border-white/25 bg-[#042821]/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#FFFCF7] backdrop-blur-md pointer-events-none z-10">
                        {t(category.id === 'all' ? 'pantry.start' : 'pantry.value')}
                      </span>
                    ) : null}
                    </div>
                    <div className="pantry-tile-label absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 pointer-events-none z-10">
                      <div className="min-w-0">
                        <span dir="auto" className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#e4c783] sm:text-[10px]">{category.badge || t(`pantry.${category.id}Eyebrow`, 'Collection')}</span>
                        <h3 dir="auto" className="font-serif text-2xl font-medium leading-tight text-[#FFFCF7] drop-shadow-md">{category.title || t(`pantry.${category.id}`, category.name)}</h3>
                      </div>
                      <span className="pantry-tile-arrow flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#FFFCF7]/25 bg-[#FFFCF7]/10 text-[#FFFCF7] backdrop-blur-md transition-colors group-hover:border-[var(--color-gold)] group-hover:bg-[var(--color-gold)] group-hover:text-[#042821] motion-reduce:transition-none"><ArrowUpRight size={17} aria-hidden="true" /></span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="editorial-pantry-controls">
          <div className="editorial-pantry-caption">
            <span className="editorial-pantry-progress" aria-hidden="true"><span /></span>
            <p dir="auto">{t(reducedMotion ? 'pantry.manualHint' : 'pantry.rotationHint')}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" disabled={!canScrollPrev} onClick={scrollPrev} aria-label={t('pantry.previous')} className="editorial-carousel-arrow focus-ring"><ChevronLeft size={18} aria-hidden="true" /></button>
            <button type="button" disabled={!canScrollNext} onClick={scrollNext} aria-label={t('pantry.next')} className="editorial-carousel-arrow focus-ring"><ChevronRight size={18} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="mt-7 text-center sm:hidden">
          <Link to="/shop" className="focus-ring inline-flex min-h-12 items-center justify-center w-full py-3 rounded-full bg-[var(--color-base)] border border-[var(--color-border)] text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink)] hover:border-[var(--color-gold)]">
            <span>{t('pantry.explore')}</span><ArrowUpRight size={13} className="ml-1.5 text-[var(--color-gold)]" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

