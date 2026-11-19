import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export const DEFAULT_CAROUSEL_RESUME_MS = 4000;

export interface CarouselAutoSlideState {
  enabled: boolean;
  reducedMotion: boolean;
  inView: boolean;
  pageVisible: boolean;
  hovered: boolean;
  pointerDown: boolean;
  interacting: boolean;
  focusWithin: boolean;
  modalOpen: boolean;
  itemCount: number;
}

/**
 * Pure predicate deciding whether a carousel should auto-slide right now.
 * Pauses on hover, active press/touch, recent interaction (4s grace window),
 * keyboard focus, open detail modal, offscreen viewport, hidden tab, or reduced motion.
 */
export function canCarouselAutoSlide(state: CarouselAutoSlideState): boolean {
  return (
    state.enabled &&
    state.itemCount > 1 &&
    !state.reducedMotion &&
    state.inView &&
    state.pageVisible &&
    !state.hovered &&
    !state.pointerDown &&
    !state.interacting &&
    !state.focusWithin &&
    !state.modalOpen
  );
}

export interface UseCarouselAutoSlideOptions {
  enabled?: boolean;
  itemCount?: number;
  resumeDelayMs?: number;
  observeRef?: React.RefObject<Element | null>;
  intersectionThreshold?: number;
  modalOpen?: boolean;
  pauseOnHover?: boolean;
}

export interface CarouselAutoSlideHandle {
  isRunning: boolean;
  isPausedByUser: boolean;
  reducedMotion: boolean;
  inView: boolean;
  pageVisible: boolean;
  hovered: boolean;
  pointerDown: boolean;
  interacting: boolean;
  focusWithin: boolean;
  /** Pauses immediately while pointer/touch is held down, then resumes resumeDelayMs (default 4s) after release. */
  beginInteraction: () => void;
  /** Marks interaction released and starts the 4s auto-resume timer. */
  endInteraction: () => void;
  /** Convenience for discrete clicks (arrows, dots, keyboard): pause now and auto-resume after resumeDelayMs. */
  pauseTemporarily: () => void;
  /** Clear any pending pause timer immediately. */
  resumeNow: () => void;
  /** Ready-to-spread DOM event handlers for the carousel container/viewport. */
  containerProps: {
    onPointerEnter: (event: React.PointerEvent) => void;
    onPointerLeave: (event: React.PointerEvent) => void;
    onPointerDownCapture: (event: React.PointerEvent) => void;
    onPointerUpCapture: () => void;
    onPointerCancelCapture: () => void;
    onTouchStart: () => void;
    onTouchEnd: () => void;
    onTouchCancel: () => void;
    onFocusCapture: (event: React.FocusEvent) => void;
    onBlurCapture: (event: React.FocusEvent) => void;
  };
}

/**
 * Shared auto-slide controller for every AllBarka carousel (homepage bestsellers,
 * categories/collections, testimonials marquee, and distinctions carousel):
 * - Pauses on mouse hover and touch/pointer interaction
 * - Automatically resumes 4 seconds (default) after touch/click release — never permanently stuck
 * - Pauses when the browser tab is hidden (`visibilitychange`) and resumes on return
 * - Pauses offscreen (`IntersectionObserver`)
 * - Disables auto-slide completely when `prefers-reduced-motion: reduce` is active
 */
export function useCarouselAutoSlide(options: UseCarouselAutoSlideOptions = {}): CarouselAutoSlideHandle {
  const {
    enabled = true,
    itemCount = 2,
    resumeDelayMs = DEFAULT_CAROUSEL_RESUME_MS,
    observeRef,
    intersectionThreshold = 0.1,
    modalOpen = false,
    pauseOnHover = true,
  } = options;

  const reducedMotion = Boolean(usePrefersReducedMotion());
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownRef = useRef(false);

  const [inView, setInView] = useState<boolean>(() => !observeRef || typeof IntersectionObserver === 'undefined');
  const [pageVisible, setPageVisible] = useState<boolean>(() => typeof document === 'undefined' || !document.hidden);
  const [hovered, setHovered] = useState(false);
  const [pointerDown, setPointerDown] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current !== null) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const scheduleResume = useCallback(() => {
    clearResumeTimer();
    setInteracting(true);
    resumeTimerRef.current = setTimeout(() => {
      resumeTimerRef.current = null;
      pointerDownRef.current = false;
      setPointerDown(false);
      setInteracting(false);
    }, resumeDelayMs);
  }, [clearResumeTimer, resumeDelayMs]);

  const beginInteraction = useCallback(() => {
    clearResumeTimer();
    pointerDownRef.current = true;
    setPointerDown(true);
    setInteracting(true);
  }, [clearResumeTimer]);

  const endInteraction = useCallback(() => {
    pointerDownRef.current = false;
    setPointerDown(false);
    scheduleResume();
  }, [scheduleResume]);

  const pauseTemporarily = useCallback(() => {
    pointerDownRef.current = false;
    setPointerDown(false);
    scheduleResume();
  }, [scheduleResume]);

  const resumeNow = useCallback(() => {
    clearResumeTimer();
    pointerDownRef.current = false;
    setPointerDown(false);
    setInteracting(false);
  }, [clearResumeTimer]);

  // Cleanup timer on unmount
  useEffect(() => () => clearResumeTimer(), [clearResumeTimer]);

  // Global release safeguard: if a user drags outside the carousel and releases, still start the 4s resume timer!
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleGlobalRelease = () => {
      if (pointerDownRef.current) {
        endInteraction();
      }
    };
    window.addEventListener('pointerup', handleGlobalRelease, { passive: true });
    window.addEventListener('pointercancel', handleGlobalRelease, { passive: true });
    window.addEventListener('touchend', handleGlobalRelease, { passive: true });
    window.addEventListener('touchcancel', handleGlobalRelease, { passive: true });
    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('touchcancel', handleGlobalRelease);
    };
  }, [endInteraction]);

  // Pause when browser tab is hidden, resume when visible
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const syncVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', syncVisibility);
    syncVisibility();
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, []);

  // Pause when carousel is offscreen
  useEffect(() => {
    const node = observeRef?.current;
    if (!observeRef) {
      setInView(true);
      return;
    }
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry && entry.isIntersecting && entry.intersectionRatio >= intersectionThreshold)),
      { threshold: intersectionThreshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [observeRef, intersectionThreshold]);

  const onPointerEnter = useCallback(
    (event: React.PointerEvent) => {
      if (pauseOnHover && event.pointerType === 'mouse') {
        setHovered(true);
      }
    },
    [pauseOnHover]
  );

  const onPointerLeave = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType === 'mouse') {
        setHovered(false);
        if (pointerDownRef.current) {
          endInteraction();
        }
      }
    },
    [endInteraction]
  );

  const onPointerDownCapture = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        setHovered(false);
      }
      beginInteraction();
    },
    [beginInteraction]
  );

  const onPointerUpCapture = useCallback(() => {
    endInteraction();
  }, [endInteraction]);

  const onPointerCancelCapture = useCallback(() => {
    endInteraction();
  }, [endInteraction]);

  const onTouchStart = useCallback(() => {
    setHovered(false);
    beginInteraction();
  }, [beginInteraction]);

  const onTouchEnd = useCallback(() => {
    endInteraction();
  }, [endInteraction]);

  const onTouchCancel = useCallback(() => {
    endInteraction();
  }, [endInteraction]);

  const onFocusCapture = useCallback((event: React.FocusEvent) => {
    const target = event.target as HTMLElement | null;
    try {
      setFocusWithin(Boolean(target && target.matches(':focus-visible')));
    } catch {
      setFocusWithin(false);
    }
  }, []);

  const onBlurCapture = useCallback((event: React.FocusEvent) => {
    const container = event.currentTarget as HTMLElement | null;
    const related = event.relatedTarget as Node | null;
    if (!container || !container.contains(related)) {
      setFocusWithin(false);
    }
  }, []);

  const isRunning = canCarouselAutoSlide({
    enabled,
    reducedMotion,
    inView,
    pageVisible,
    hovered,
    pointerDown,
    interacting,
    focusWithin,
    modalOpen,
    itemCount,
  });

  const isPausedByUser = hovered || pointerDown || interacting || focusWithin || modalOpen;

  return {
    isRunning,
    isPausedByUser,
    reducedMotion,
    inView,
    pageVisible,
    hovered,
    pointerDown,
    interacting,
    focusWithin,
    beginInteraction,
    endInteraction,
    pauseTemporarily,
    resumeNow,
    containerProps: {
      onPointerEnter,
      onPointerLeave,
      onPointerDownCapture,
      onPointerUpCapture,
      onPointerCancelCapture,
      onTouchStart,
      onTouchEnd,
      onTouchCancel,
      onFocusCapture,
      onBlurCapture,
    },
  };
}
