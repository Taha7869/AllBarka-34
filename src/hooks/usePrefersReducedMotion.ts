import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
const media = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia(query) : null;
const snapshot = () => Boolean(media()?.matches);
const serverSnapshot = () => false;

function subscribe(notify: () => void) {
  const preference = media();
  if (!preference) return () => {};
  if (typeof preference.addEventListener === 'function') {
    preference.addEventListener('change', notify);
    return () => preference.removeEventListener('change', notify);
  }
  if (typeof preference.addListener !== 'function') return () => {};
  preference.addListener(notify);
  return () => preference.removeListener(notify);
}

/** Keep mounted consumers in sync when the device preference changes. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
