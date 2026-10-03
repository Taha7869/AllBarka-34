import { useMemo, useSyncExternalStore } from 'react';

const KEY = 'allbarka_saved_products';
const EVENT = 'allbarka-saved-products-change';
let memory = '[]';
let storageFailed = false;
function read() {
  if (storageFailed) return memory;
  try { return localStorage.getItem(KEY) || '[]'; } catch { return memory; }
}
function subscribe(callback: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) callback(); };
  window.addEventListener('storage', storage);
  window.addEventListener(EVENT, callback);
  return () => { window.removeEventListener('storage', storage); window.removeEventListener(EVENT, callback); };
}
export function useSavedProducts() {
  const raw = useSyncExternalStore(subscribe, read, () => '[]');
  const savedIds = useMemo<string[]>(() => {
    try { const parsed: unknown = JSON.parse(raw); if (Array.isArray(parsed)) return parsed.filter((id): id is string => typeof id === 'string'); } catch {}
    return [];
  }, [raw]);
  const setSaved = (id: string, saved: boolean) => {
    let latest: string[] = [];
    try { const parsed = JSON.parse(read()); if (Array.isArray(parsed)) latest = parsed.filter(item => typeof item === 'string'); } catch {}
    const ids = new Set(latest);
    if (saved) ids.add(id); else ids.delete(id);
    memory = JSON.stringify([...ids]);
    try { localStorage.setItem(KEY, memory); storageFailed = false; } catch { storageFailed = true; }
    window.dispatchEvent(new Event(EVENT));
  };
  return { savedIds, setSaved };
}
