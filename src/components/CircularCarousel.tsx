import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import type { Product } from '../types';
import ProductCard from './ProductCard';
import { getLocalized } from '../utils/localize';
import { useCircularCarouselLanguage } from '../hooks/useCircularCarouselLanguage';
import { circularCardProjection, shouldRotateCatalogue, visibleCardFraction } from '../lib/circularCatalogue';

interface CircularCarouselProps {
  products: Product[];
  onAddToCart: (productId: string, weight: string) => void;
  onQuickView: (product: Product) => void;
}

/**
 * CircularCarousel's cylinder treatment, adapted for real interactive product cards.
 * Embla owns the infinite loop and touch gestures; the curve uses shallow CSS 3D.
 * No sliced duplicate photographs or transformed copies of checkout controls.
 */
export default function CircularCarousel({ products, onAddToCart, onQuickView }: CircularCarouselProps) {
  const { t, language } = useCircularCarouselLanguage();
  const reducedMotion = Boolean(useReducedMotion());
  const rootRef = useRef<HTMLDivElement>(null);
  const interactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleIndicesRef = useRef<number[]>([0]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [visibleIndices, setVisibleIndices] = useState<number[]>([0]);
  const [interacting, setInteracting] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [playing, setPlaying] = useState(false);
  const player = useMemo(() => Autoplay({
    delay: 7000, playOnInit: false, stopOnInteraction: true,
    stopOnMouseEnter: false, stopOnFocusIn: false, stopOnLastSnap: false,
  }), []);
  const plugins = useMemo(() => [player], [player]);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center', loop: products.length > 1, slidesToScroll: 1,
    containScroll: false, duration: reducedMotion ? 0 : 32,
    // Each image gallery keeps its own photo swipe; shopping controls keep their clicks.
    watchDrag: (_api, event) => !(event.target instanceof Element && event.target.closest('.product-gallery,button,input,select,textarea,a')),
  }, plugins);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= .1), { threshold: .1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sync = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  const canRotate = shouldRotateCatalogue({
    reducedMotion, inView, pageVisible, hovered, focusWithin, interacting, count: products.length,
  });
  useEffect(() => {
    const autoplay = emblaApi?.plugins().autoplay;
    if (!autoplay || !emblaApi) return;
    const syncPlayback = () => {
      if (canRotate) { if (!autoplay.isPlaying()) autoplay.play(); }
      else autoplay.stop();
    };
    syncPlayback();
    // Resizing recreates Embla's plugin; retain the current reading safeguards.
    emblaApi.on('reInit', syncPlayback);
    return () => { emblaApi.off('reInit', syncPlayback); };
  }, [emblaApi, canRotate]);

  useEffect(() => {
    if (!emblaApi) return;
    let frame = 0;
    const updateCurve = () => {
      frame = 0;
      const viewport = emblaApi.rootNode().getBoundingClientRect();
      if (!viewport.width) return;
      const center = viewport.left + viewport.width / 2;
      const slides = emblaApi.slideNodes();
      // Read all geometry before writing to avoid forced layout during a swipe.
      const geometry = slides.map(slide => {
        const rect = slide.getBoundingClientRect();
        return {
          position: (rect.left + rect.width / 2 - center) / (viewport.width / 2),
          readable: visibleCardFraction(rect.left, rect.width, viewport.left, viewport.width) >= .8,
        };
      });
      const readableIndices = geometry.flatMap((card, index) => card.readable ? [index] : []);
      // Do not expose shopping controls in a merely intersecting, clipped side card.
      if (readableIndices.length !== visibleIndicesRef.current.length || readableIndices.some((index, i) => index !== visibleIndicesRef.current[i])) {
        visibleIndicesRef.current = readableIndices;
        setVisibleIndices(readableIndices);
      }
      slides.forEach((slide, index) => {
        const card = slide.firstElementChild as HTMLElement | null;
        if (!card) return;
        const curve = circularCardProjection(geometry[index].position, reducedMotion);
        card.style.setProperty('--circular-turn', `${curve.rotation.toFixed(2)}deg`);
        card.style.setProperty('--circular-rise', `${curve.rise.toFixed(2)}px`);
        card.style.setProperty('--circular-scale', String(curve.scale));
        card.style.setProperty('--circular-depth', `${curve.depth.toFixed(2)}px`);
      });
    };
    const scheduleCurve = () => { if (!frame) frame = requestAnimationFrame(updateCurve); };
    // Instant reduced-motion navigation emits select without a scroll animation.
    const syncSelection = () => { setSelectedIndex(emblaApi.selectedScrollSnap()); scheduleCurve(); };
    const syncPlayer = () => setPlaying(emblaApi.plugins().autoplay?.isPlaying() || false);
    // The plugin emits these events before updating isPlaying(), so use the event intent.
    const onPlay = () => setPlaying(true);
    const onStop = () => setPlaying(false);
    const syncAll = () => { syncSelection(); syncPlayer(); scheduleCurve(); };
    syncAll();
    emblaApi.on('scroll', scheduleCurve).on('select', syncSelection)
      .on('reInit', syncAll).on('resize', scheduleCurve).on('autoplay:play', onPlay).on('autoplay:stop', onStop);
    return () => {
      cancelAnimationFrame(frame);
      emblaApi.off('scroll', scheduleCurve).off('select', syncSelection)
        .off('reInit', syncAll).off('resize', scheduleCurve).off('autoplay:play', onPlay).off('autoplay:stop', onStop);
    };
  }, [emblaApi, reducedMotion]);

  const takeControl = useCallback(() => {
    player.stop();
    setInteracting(true);
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    // Resume after a reading interval instead of requiring a removed play button.
    interactionTimerRef.current = setTimeout(() => setInteracting(false), 10000);
  }, [player]);
  useEffect(() => () => { if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current); }, []);
  const move = (step: -1 | 1) => { takeControl(); if (step < 0) emblaApi?.scrollPrev(); else emblaApi?.scrollNext(); };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); takeControl(); emblaApi?.scrollTo(event.key === 'Home' ? 0 : products.length - 1, reducedMotion);
    }
  };
  // Side peeks stay painted, but their clipped controls cannot receive focus.
  const visible = new Set([...visibleIndices, selectedIndex]);
  const current = products[selectedIndex];
  const position = t('circular.position').replace('{current}', String(selectedIndex + 1)).replace('{total}', String(products.length));

  if (!products.length) return null;
  return (
    <div ref={rootRef} className="circular-boutique" dir="ltr" data-playing={playing} data-interacting={interacting}
      onFocusCapture={event => setFocusWithin(event.target.matches(':focus-visible'))}
      onKeyDownCapture={() => setFocusWithin(true)}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false); }}>
      <div className="circular-boutique-viewport focus-ring" ref={emblaRef} tabIndex={0} role="region"
        aria-roledescription={t('circular.type')} aria-label={t('slider.carousel')} onKeyDown={handleKeyDown}
        onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }}
        onPointerLeave={event => { if (event.pointerType === 'mouse') setHovered(false); }}
        onPointerDownCapture={takeControl} onPointerUpCapture={takeControl} onPointerCancelCapture={takeControl}>
        <div className="circular-boutique-track">
          {products.map((product, index) => (
            <div key={product.id} className="circular-boutique-slide" role="group" data-active={index === selectedIndex}
              aria-roledescription={t('circular.slide')}
              aria-label={`${getLocalized(product, 'name', language)} — ${t('circular.position').replace('{current}', String(index + 1)).replace('{total}', String(products.length))}`}
              aria-hidden={!visible.has(index)} inert={!visible.has(index)}>
              <div className="circular-boutique-card">
                <ProductCard product={product} isWholesale={false} onAddToCart={onAddToCart} onQuickView={onQuickView} viewMode="grid" />
              </div>
            </div>
          ))}
        </div>
        <div className="circular-boutique-edge circular-boutique-edge-left" aria-hidden="true" />
        <div className="circular-boutique-edge circular-boutique-edge-right" aria-hidden="true" />
      </div>
      <div className="circular-boutique-controls" role="group" aria-label={t('slider.carousel')}>
        <div className="circular-boutique-caption">
          <output className="bestseller-position" aria-label={position}>
            <span>{String(selectedIndex + 1).padStart(2, '0')}</span><span aria-hidden="true">/</span><span>{String(products.length).padStart(2, '0')}</span>
          </output>
          <p dir="auto">{t('circular.tour')}</p>
        </div>
        {products.length > 1 && <div className="circular-boutique-buttons">
          <button type="button" onClick={() => move(-1)} className="bestseller-control focus-ring" aria-label={t('slider.previous')}><ChevronLeft size={19} /></button>
          <button type="button" onClick={() => move(1)} className="bestseller-control focus-ring" aria-label={t('slider.next')}><ChevronRight size={19} /></button>
        </div>}
      </div>
      <p className="circular-boutique-hint" dir="auto">{t(reducedMotion ? 'circular.manual' : 'circular.swipe')}</p>
      <p className="sr-only" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">{current ? `${getLocalized(current, 'name', language)}. ${position}` : ''}</p>
    </div>
  );
}
