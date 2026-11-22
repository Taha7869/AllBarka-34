import React, { useEffect, useState } from 'react';
import type { Product } from '../types';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const BOX_CATEGORIES = new Set(['gift-boxes', 'celebration-boxes', 'bundles']);
const BOX_ID_PATTERN = /^(gift-|bundle-|bid-box-)/i;

/**
 * Returns true when the product is a presentation box, gift hamper, celebration bid box,
 * or curated bundle eligible for the one-shot lid-opening reveal on PDP.
 */
export function isBoxOrBundleProduct(
  product: Pick<Product, 'id' | 'category' | 'isBundle' | 'isBidBox'> | null | undefined,
): boolean {
  if (!product) return false;
  if (product.isBundle === true || product.isBidBox === true) return true;
  if (typeof product.category === 'string' && BOX_CATEGORIES.has(product.category.trim().toLowerCase())) {
    return true;
  }
  if (typeof product.id === 'string' && BOX_ID_PATTERN.test(product.id.trim())) {
    return true;
  }
  return false;
}

export interface BoxLidRevealProps {
  product: Pick<Product, 'id' | 'category' | 'isBundle' | 'isBidBox'> | null | undefined;
  /** Optional test override to simulate prefers-reduced-motion deterministically. */
  reducedMotionOverride?: boolean;
}

const LID_OPEN_DURATION_MS = 760;

/**
 * Tactile one-shot lid-opening reveal for box and bundle PDP imagery.
 * - Plays once per product mount (parent should pass `key={product.id}`).
 * - Completely disabled (`null`) when `prefers-reduced-motion: reduce` is active.
 * - Strictly `pointer-events-none` and `aria-hidden="true"`, unmounting cleanly once opened.
 */
export default function BoxLidReveal({ product, reducedMotionOverride }: BoxLidRevealProps) {
  const systemReduced = usePrefersReducedMotion();
  const reducedMotion = reducedMotionOverride ?? systemReduced;
  const eligible = isBoxOrBundleProduct(product);

  const [opening, setOpening] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!eligible || reducedMotion) {
      setDone(true);
      return;
    }

    setOpening(false);
    setDone(false);

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setOpening(true);
      });
    });

    const finishTimer = window.setTimeout(() => {
      setDone(true);
    }, LID_OPEN_DURATION_MS + 90);

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      window.clearTimeout(finishTimer);
    };
  }, [eligible, reducedMotion, product?.id]);

  if (!eligible || reducedMotion || done) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      data-testid="box-lid-reveal"
      data-lid-state={opening ? 'opening' : 'closed'}
      className={`pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-3xl motion-reduce:hidden`}
    >
      {/* Upper presentation lid lifting off smoothly */}
      <div
        style={{
          transition: `transform ${LID_OPEN_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${Math.round(LID_OPEN_DURATION_MS * 0.85)}ms ease-out`,
        }}
        className={`absolute inset-x-0 top-0 h-[54%] bg-gradient-to-b from-[#042821] via-[#07362C] to-[#094034] border-b-2 border-[#C7982F] shadow-[0_14px_32px_rgba(4,40,33,0.45)] flex flex-col items-center justify-end pb-4 will-change-transform ${
          opening ? '-translate-y-[108%] opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="pointer-events-none absolute inset-3 rounded-t-2xl border border-[#C7982F]/35" />
        {/* Sculptural gold clasp ribbon (zero text over imagery) */}
        <span className="h-1.5 w-16 rounded-full bg-gradient-to-r from-[#A67C1E] via-[#E4C783] to-[#A67C1E] shadow-xs" />
      </div>

      {/* Lower box rim receding gently */}
      <div
        style={{
          transition: `transform ${LID_OPEN_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${Math.round(LID_OPEN_DURATION_MS * 0.75)}ms ease-out`,
        }}
        className={`absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-[#042821]/92 via-[#07362C]/80 to-[#094034]/65 border-t border-[#C7982F]/45 will-change-transform ${
          opening ? 'translate-y-[108%] opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="pointer-events-none absolute inset-3 rounded-b-2xl border border-[#C7982F]/25" />
      </div>
    </div>
  );
}
