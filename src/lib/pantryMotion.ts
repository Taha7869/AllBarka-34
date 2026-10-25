export interface PantryMotionState {
  reducedMotion: boolean;
  inView: boolean;
  interacting: boolean;
  hovered: boolean;
  focusWithin: boolean;
  pageVisible: boolean;
}

export function canRotatePantry(state: PantryMotionState): boolean {
  return state.inView && !state.interacting && !state.reducedMotion && !state.hovered && !state.focusWithin && state.pageVisible;
}

/** A time-based pace stays equal on 60/120 Hz screens and cannot jump after a stalled frame. */
export function pantryRotationDistance(elapsedMs: number, runningMs: number): number {
  if (![elapsedMs, runningMs].every(Number.isFinite) || elapsedMs <= 0 || runningMs <= 0) return 0;
  const acceleration = Math.min(1, runningMs / 900);
  const easedPace = acceleration * acceleration * (3 - 2 * acceleration);
  return -24 * Math.min(48, elapsedMs) / 1000 * easedPace;
}

export function pantryCardProjection(position: number, reducedMotion = false) {
  const offset = Number.isFinite(position) ? Math.max(-1.5, Math.min(1.5, position)) : 0;
  if (reducedMotion) return { rotation: 0, rise: 0, scale: 1, depth: 0 };
  return { rotation: offset * -7, rise: Math.min(8, offset * offset * 5), scale: 1 - Math.min(.025, Math.abs(offset) * .018), depth: -Math.abs(offset) * 8 };
}
