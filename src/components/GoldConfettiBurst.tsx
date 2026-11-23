import React, { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface ConfettiPiece {
  id: number;
  dx: number;
  dy: number;
  rot: number;
  w: number;
  h: number;
  color: string;
  delayMs: number;
}

const CONFETTI_PIECES: ConfettiPiece[] = [
  { id: 1, dx: -115, dy: -62, rot: -140, w: 7, h: 4, color: '#C7982F', delayMs: 0 },
  { id: 2, dx: -92, dy: -94, rot: 120, w: 6, h: 6, color: '#E4C783', delayMs: 30 },
  { id: 3, dx: -68, dy: -112, rot: -90, w: 8, h: 4, color: '#D7AA43', delayMs: 50 },
  { id: 4, dx: -38, dy: -120, rot: 165, w: 5, h: 5, color: '#F6E3B4', delayMs: 20 },
  { id: 5, dx: -12, dy: -124, rot: -115, w: 7, h: 4, color: '#C7982F', delayMs: 60 },
  { id: 6, dx: 18, dy: -122, rot: 145, w: 6, h: 4, color: '#E4C783', delayMs: 10 },
  { id: 7, dx: 46, dy: -116, rot: -135, w: 8, h: 4, color: '#C7982F', delayMs: 40 },
  { id: 8, dx: 74, dy: -102, rot: 110, w: 5, h: 5, color: '#F6E3B4', delayMs: 70 },
  { id: 9, dx: 100, dy: -82, rot: -160, w: 7, h: 4, color: '#D7AA43', delayMs: 25 },
  { id: 10, dx: 118, dy: -56, rot: 130, w: 6, h: 4, color: '#C7982F', delayMs: 55 },
  { id: 11, dx: -126, dy: -18, rot: 95, w: 6, h: 4, color: '#1E3A2B', delayMs: 45 },
  { id: 12, dx: 124, dy: -14, rot: -105, w: 6, h: 4, color: '#1E3A2B', delayMs: 65 },
  { id: 13, dx: -84, dy: -46, rot: 180, w: 5, h: 5, color: '#E4C783', delayMs: 85 },
  { id: 14, dx: 82, dy: -42, rot: -175, w: 5, h: 5, color: '#E4C783', delayMs: 75 },
  { id: 15, dx: -48, dy: -74, rot: 150, w: 7, h: 3, color: '#C7982F', delayMs: 95 },
  { id: 16, dx: 52, dy: -72, rot: -155, w: 7, h: 3, color: '#C7982F', delayMs: 90 },
  { id: 17, dx: -24, dy: -88, rot: 125, w: 6, h: 4, color: '#F6E3B4', delayMs: 110 },
  { id: 18, dx: 26, dy: -86, rot: -125, w: 6, h: 4, color: '#F6E3B4', delayMs: 105 },
  { id: 19, dx: -104, dy: 12, rot: -85, w: 6, h: 3, color: '#D7AA43', delayMs: 120 },
  { id: 20, dx: 106, dy: 14, rot: 85, w: 6, h: 3, color: '#D7AA43', delayMs: 115 },
];

/**
 * Quiet one-time gold foil confetti burst (1.5s) around the Order Success seal stamp.
 * Pure transform + opacity; never loops; unmounts after 1.65s; disabled under prefers-reduced-motion.
 */
export default function GoldConfettiBurst() {
  const reducedMotion = usePrefersReducedMotion();
  const [active, setActive] = useState<boolean>(() => typeof window !== 'undefined' && !reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setActive(false);
      return;
    }
    setActive(true);
    const timer = window.setTimeout(() => setActive(false), 1650);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  if (!active || reducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="order-gold-confetti"
      className="pointer-events-none absolute left-1/2 top-12 z-20 h-0 w-0 overflow-visible"
    >
      {CONFETTI_PIECES.map((piece) => (
        <span
          key={piece.id}
          className="gold-confetti-piece"
          style={
            {
              width: `${piece.w}px`,
              height: `${piece.h}px`,
              backgroundColor: piece.color,
              animationDelay: `${piece.delayMs}ms`,
              '--confetti-dx': `${piece.dx}px`,
              '--confetti-dy': `${piece.dy}px`,
              '--confetti-rot': `${piece.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
