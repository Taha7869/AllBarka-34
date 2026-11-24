import { flushSync } from 'react-dom';
import type { NavigateFunction, To } from 'react-router-dom';

export const PRODUCT_HERO_TRANSITION_NAME = 'allbarka-product-hero';

interface ViewTransitionLike {
  finished: Promise<void>;
  ready?: Promise<void>;
  updateCallbackDone?: Promise<void>;
  skipTransition?: () => void;
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void | Promise<void>) => ViewTransitionLike;
};

interface PendingTransition {
  productId: string;
  direction: 'to-pdp' | 'to-card';
  claimed: boolean;
  resolveReady?: () => void;
}

let pendingTransition: PendingTransition | null = null;
let activeSourceEl: HTMLElement | null = null;
let activeTargetEl: HTMLElement | null = null;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

function isReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function supportsViewTransitions(): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;
  if (isReducedMotion()) return false;
  return typeof (document as DocumentWithViewTransition).startViewTransition === 'function';
}

export function shouldInterceptLinkClick(event: {
  defaultPrevented: boolean;
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function clearElementTag(el: HTMLElement | null): void {
  if (!el) return;
  try {
    el.style.viewTransitionName = '';
    delete el.dataset.vtActive;
  } catch {
    // Ignore detached / read-only nodes in synthetic DOMs
  }
}

function clearAllTaggedElements(): void {
  clearElementTag(activeSourceEl);
  clearElementTag(activeTargetEl);
  if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
    document.querySelectorAll<HTMLElement>('[data-vt-active="true"]').forEach(clearElementTag);
  }
}

/** Always strips view-transition-name immediately so duplicate cards never collide. */
export function clearProductViewTransition(): void {
  if (cleanupTimer !== null) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
  if (pendingTransition?.resolveReady) {
    pendingTransition.resolveReady();
  }
  clearAllTaggedElements();
  activeSourceEl = null;
  activeTargetEl = null;
  pendingTransition = null;
}

function tagUniqueElement(el: HTMLElement): void {
  clearAllTaggedElements();
  el.style.viewTransitionName = PRODUCT_HERO_TRANSITION_NAME;
  el.dataset.vtActive = 'true';
}

function findVisibleImage(container: HTMLElement | null | undefined): HTMLImageElement | null {
  if (!container) return null;
  const candidate =
    container.tagName === 'IMG'
      ? (container as HTMLImageElement)
      : container.querySelector<HTMLImageElement>('img');
  if (!candidate || !candidate.isConnected) return null;
  if (typeof candidate.getBoundingClientRect === 'function') {
    const rect = candidate.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
  }
  return candidate;
}

function waitForTargetClaim(timeoutMs: number): Promise<void> {
  if (!pendingTransition || pendingTransition.claimed) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    if (pendingTransition) {
      pendingTransition.resolveReady = () => {
        clearTimeout(timer);
        finish();
      };
    } else {
      clearTimeout(timer);
      finish();
    }
  });
}

let pdpChunkPromise: Promise<unknown> | null = null;
function preloadProductDetailChunk(): Promise<unknown> {
  if (!pdpChunkPromise) {
    pdpChunkPromise = import('../pages/ProductDetailPage').catch(() => {
      pdpChunkPromise = null;
    });
  }
  return pdpChunkPromise;
}

/**
 * Navigates from a product card to its PDP using the View Transitions API.
 * Sets `view-transition-name` ONLY on the clicked card image and matching PDP image,
 * then clears it immediately on completion. Falls back silently to normal navigation.
 */
export function navigateToProductWithTransition(
  navigate: NavigateFunction,
  to: To,
  options: { productId: string; sourceElement?: HTMLElement | null },
): boolean {
  const { productId, sourceElement } = options;
  if (!supportsViewTransitions() || !productId) {
    navigate(to);
    return false;
  }

  const sourceImg = findVisibleImage(sourceElement);
  if (!sourceImg) {
    navigate(to);
    return false;
  }

  const startTransition = (document as DocumentWithViewTransition).startViewTransition?.bind(document);
  if (!startTransition) {
    navigate(to);
    return false;
  }

  void (async () => {
    try {
      // Ensure lazy PDP chunk is loaded before taking the View Transition snapshot
      await Promise.race([
        preloadProductDetailChunk(),
        new Promise((resolve) => setTimeout(resolve, 450)),
      ]);
      if (!sourceImg.isConnected) {
        navigate(to);
        return;
      }

      clearProductViewTransition();
      activeSourceEl = sourceImg;
      tagUniqueElement(sourceImg);
      pendingTransition = { productId, direction: 'to-pdp', claimed: false };

      cleanupTimer = setTimeout(clearProductViewTransition, 1200);

      const transition = startTransition(async () => {
        flushSync(() => {
          navigate(to);
        });
        await waitForTargetClaim(220);
      });

      transition.finished.catch(() => {}).finally(clearProductViewTransition);
    } catch {
      clearProductViewTransition();
      navigate(to);
    }
  })();

  return true;
}

/**
 * Reverse shared-element transition from PDP back to the previous collection/home card.
 */
export function navigateBackFromProductWithTransition(
  navigate: NavigateFunction,
  to: To | number,
  options: { productId: string; sourceElement?: HTMLElement | null },
): boolean {
  const { productId, sourceElement } = options;
  const performNavigate = () => {
    if (typeof to === 'number') {
      navigate(to);
    } else {
      navigate(to);
    }
  };

  if (!supportsViewTransitions() || !productId) {
    performNavigate();
    return false;
  }

  const sourceImg = findVisibleImage(sourceElement);
  if (!sourceImg) {
    performNavigate();
    return false;
  }

  const startTransition = (document as DocumentWithViewTransition).startViewTransition?.bind(document);
  if (!startTransition) {
    performNavigate();
    return false;
  }

  try {
    clearProductViewTransition();
    activeSourceEl = sourceImg;
    tagUniqueElement(sourceImg);
    pendingTransition = { productId, direction: 'to-card', claimed: false };

    cleanupTimer = setTimeout(clearProductViewTransition, 1200);

    const transition = startTransition(async () => {
      flushSync(() => {
        performNavigate();
      });
      await waitForTargetClaim(220);
    });

    transition.finished.catch(() => {}).finally(clearProductViewTransition);
    return true;
  } catch {
    clearProductViewTransition();
    performNavigate();
    return false;
  }
}

/**
 * Called by ProductDetailPage's main photo on mount to claim the active forward transition.
 */
export function claimProductTransitionTarget(
  productId: string | undefined,
  element: HTMLElement | null,
): boolean {
  if (!productId || !element || !element.isConnected) return false;
  if (
    pendingTransition &&
    pendingTransition.direction === 'to-pdp' &&
    pendingTransition.productId === productId &&
    !pendingTransition.claimed
  ) {
    pendingTransition.claimed = true;
    activeTargetEl = element;
    tagUniqueElement(element);
    pendingTransition.resolveReady?.();
    return true;
  }
  return false;
}

/**
 * Called by ProductImageGallery on mount to claim the active reverse transition (once only).
 */
export function claimReturnCardTransitionTarget(
  productId: string | undefined,
  element: HTMLElement | null,
): boolean {
  if (!productId || !element || !element.isConnected) return false;
  if (
    pendingTransition &&
    pendingTransition.direction === 'to-card' &&
    pendingTransition.productId === productId &&
    !pendingTransition.claimed
  ) {
    pendingTransition.claimed = true;
    activeTargetEl = element;
    tagUniqueElement(element);
    pendingTransition.resolveReady?.();
    return true;
  }
  return false;
}

export function getPendingProductTransition(): Readonly<{
  productId: string;
  direction: 'to-pdp' | 'to-card';
  claimed: boolean;
}> | null {
  if (!pendingTransition) return null;
  return {
    productId: pendingTransition.productId,
    direction: pendingTransition.direction,
    claimed: pendingTransition.claimed,
  };
}
