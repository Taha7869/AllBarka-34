import { useMemo, useSyncExternalStore } from 'react';
import { PRODUCTS } from '../data/products';
import { catalogIds, recordView, COMPARE_KEY, RECENT_KEY } from '../lib/catalogActivity';
const listeners = new Set<() => void>();
const memory: Record<string, string> = {};
const read = (key: string) => { try { return localStorage.getItem(key) || memory[key] || '[]'; } catch { return memory[key] || '[]'; } };
const write = (key: string, ids: string[]) => { memory[key] = JSON.stringify(ids); try { localStorage.setItem(key, memory[key]); } catch { /* memory remains usable */ } listeners.forEach(listener => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); window.addEventListener('storage', listener); return () => { listeners.delete(listener); window.removeEventListener('storage', listener); }; };
const parse = (raw: string, max: number) => { try { return catalogIds(JSON.parse(raw), PRODUCTS, max); } catch { return []; } };
const trackView = (id: string) => write(RECENT_KEY, recordView(parse(read(RECENT_KEY), 8), id, PRODUCTS));
export function useCatalogActivity() {
  const compared = useSyncExternalStore(subscribe, () => read(COMPARE_KEY), () => '[]');
  const recent = useSyncExternalStore(subscribe, () => read(RECENT_KEY), () => '[]');
  const compareIds = useMemo(() => parse(compared, 3), [compared]); const recentIds = useMemo(() => parse(recent, 8), [recent]);
  return { compareIds, recentIds,
    toggleCompare: (id: string) => { const ids = parse(read(COMPARE_KEY), 3); if (ids.includes(id)) write(COMPARE_KEY, ids.filter(value => value !== id)); else if (ids.length < 3) write(COMPARE_KEY, catalogIds([...ids, id], PRODUCTS, 3)); else return false; return true; },
    clearCompare: () => write(COMPARE_KEY, []), clearRecent: () => write(RECENT_KEY, []),
    view: trackView,
  };
}
