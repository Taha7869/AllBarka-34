import type { Product } from '../types';

/** Keep the featured order, but tour the complete current catalogue exactly once. */
export function circularCatalogue(featured: readonly Product[], catalogue: readonly Product[]): Product[] {
  const canonical = new Map(catalogue.map(product => [product.id, product]));
  const seen = new Set<string>();
  return [...featured, ...catalogue].flatMap(product => {
    const current = canonical.get(product.id);
    if (!current || seen.has(current.id)) return [];
    seen.add(current.id);
    return [current];
  });
}

export interface CatalogueMotionState {
  reducedMotion: boolean;
  inView: boolean;
  pageVisible: boolean;
  hovered: boolean;
  focusWithin: boolean;
  interacting: boolean;
  count: number;
}

export function shouldRotateCatalogue(state: CatalogueMotionState): boolean {
  return state.count > 1 && !state.reducedMotion && state.inView && state.pageVisible
    && !state.hovered && !state.focusWithin && !state.interacting;
}

/** Painted side peeks are not necessarily readable enough to expose their controls. */
export function visibleCardFraction(left: number, width: number, viewportLeft: number, viewportWidth: number): number {
  if (![left, width, viewportLeft, viewportWidth].every(Number.isFinite) || width <= 0 || viewportWidth <= 0) return 0;
  const visibleWidth = Math.min(left + width, viewportLeft + viewportWidth) - Math.max(left, viewportLeft);
  return Math.max(0, Math.min(1, visibleWidth / width));
}

/** A shallow cylinder arc keeps real product text and controls readable. */
export function circularCardProjection(distance: number, reducedMotion = false) {
  const position = Number.isFinite(distance) ? Math.max(-2, Math.min(2, distance)) : 0;
  const depth = Math.abs(position);
  if (reducedMotion) return { rotation: 0, rise: 0, scale: 1, depth: 0 };
  return { rotation: -position * 12, rise: depth * 6, scale: 1 - depth * .015, depth: -depth * 12 };
}
