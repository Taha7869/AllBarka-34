import { apiUrl } from '../lib/apiUrl';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { resolveProductMedia, sanitizeProductMediaOverrides, type ProductMedia, type ProductMediaOverrides } from '../lib/productMedia';
import type { Product } from '../types';

const CACHE_TTL_MS = 60_000;
let cached: { overrides: ProductMediaOverrides; at: number } | null = null;

interface ProductMediaRegistry {
  overrides: ProductMediaOverrides;
  refresh: () => Promise<void>;
  setOverride: (productId: string, media: ProductMedia | null) => void;
}

const ProductMediaContext = createContext<ProductMediaRegistry>({ overrides: {}, refresh: async () => {}, setOverride: () => {} });

export function ProductMediaProvider({ children, initialOverrides }: { children: ReactNode; initialOverrides?: ProductMediaOverrides }) {
  const [overrides, setOverrides] = useState<ProductMediaOverrides>(() => initialOverrides === undefined ? cached?.overrides || {} : sanitizeProductMediaOverrides(initialOverrides));
  const currentOverrides = useRef(overrides);
  const active = useRef(false);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const invalidateRequests = useCallback(() => { generation.current++; request.current?.abort(); }, []);
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const version = ++generation.current;
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(apiUrl('/api/product-media'), { signal: controller.signal, credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const data = await response.json();
      const next = sanitizeProductMediaOverrides(data.overrides);
      if (!active.current || generation.current !== version || controller.signal.aborted) return;
      cached = { overrides: next, at: Date.now() };
      currentOverrides.current = next;
      setOverrides(next);
    } catch { /* An unavailable optional gateway leaves local photographs fully usable. */ }
    finally { clearTimeout(timer); if (request.current === controller) request.current = null; }
  }, []);

  const setOverride = useCallback((productId: string, media: ProductMedia | null) => {
    // A successful save wins over a public request that started before it.
    invalidateRequests();
    const next = { ...currentOverrides.current };
    if (media) Object.assign(next, sanitizeProductMediaOverrides({ [productId]: media }));
    else delete next[productId];
    cached = { overrides: next, at: Date.now() };
    currentOverrides.current = next;
    setOverrides(next);
  }, [invalidateRequests]);

  useEffect(() => {
    active.current = true;
    if (!cached || Date.now() - cached.at > CACHE_TTL_MS) void refresh();
    const onFocus = () => { if (!cached || Date.now() - cached.at > CACHE_TTL_MS) void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => { active.current = false; invalidateRequests(); window.removeEventListener('focus', onFocus); };
  }, [refresh, invalidateRequests]);

  const value = useMemo(() => ({ overrides, refresh, setOverride }), [overrides, refresh, setOverride]);
  return <ProductMediaContext.Provider value={value}>{children}</ProductMediaContext.Provider>;
}

export function useProductMediaRegistry() { return useContext(ProductMediaContext); }

export function useProductMedia(product: Product | null | undefined) {
  const { overrides } = useProductMediaRegistry();
  return useMemo(() => product ? resolveProductMedia(product, overrides) : {
    images: ['/images/product-placeholder.svg'], videoUrl: '', videoPoster: '', source: 'catalogue' as const,
  }, [product, overrides]);
}

/** Resolve covers in mapped lists without calling hooks inside a loop or altering cart records. */
export function useProductMediaCover() {
  const { overrides } = useProductMediaRegistry();
  return useCallback((product: Product | null | undefined, fallback = '/images/product-placeholder.svg') => (
    product ? resolveProductMedia(product, overrides).images[0] : fallback
  ), [overrides]);
}
