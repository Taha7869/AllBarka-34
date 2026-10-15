import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { PRODUCTS } from '../data/products';
import { apiUrl } from '../lib/apiUrl';
import { pricingFromLegacy, productFromPricing } from '../lib/catalogSchema';
import type { Product } from '../types';
import { HAMPER_BOXES } from '../lib/hamperCatalog';
import { HAMPER_BOX_SEEDS, boxFromPricing, validateHamperBoxPricing } from '../lib/hamperBoxSchema';

const seeds = PRODUCTS.map(product => ({ ...product }));
const CatalogContext = createContext({ products: PRODUCTS, refresh: async () => {} });
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const active = useRef(false);
  const inFlight = useRef<AbortController | null>(null);
  const version = useRef('');
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    const controller = new AbortController(); inFlight.current = controller;
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(apiUrl('/api/catalog'), { signal: controller.signal, credentials: 'omit', cache: 'no-cache', headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const data = await response.json();
      if (!active.current || controller.signal.aborted || !Array.isArray(data.products) || typeof data.version !== 'string' || data.version === version.current) return;
      // Revalidate the public adapter and retain source-owned descriptive metadata only.
      const next = seeds.map(seed => {
        const raw = data.products.find((product: Product) => product.id === seed.id);
        if (!raw || typeof raw.catalogRevision !== 'string') throw new Error('INVALID_PUBLIC_CATALOG');
        if (raw.active === false && Object.keys(raw.prices || {}).length === 0) return { ...seed, active: false, prices: {}, variants: [], allowCustomWeight: false, catalogRevision: raw.catalogRevision };
        return productFromPricing(seed, pricingFromLegacy(raw, seed), raw.catalogRevision);
      });
      if (!Array.isArray(data.hamperBoxes)) throw new Error('INVALID_PUBLIC_CATALOG');
      const boxes = HAMPER_BOX_SEEDS.map(seed => {
        const raw = data.hamperBoxes.find((box: any) => box.id === seed.id);
        if (!raw || typeof raw.catalogRevision !== 'string') throw new Error('INVALID_PUBLIC_CATALOG');
        if (raw.active === false && raw.price === 0) return { ...seed, price: 0, active: false, catalogRevision: raw.catalogRevision };
        const pricing = validateHamperBoxPricing({ schemaVersion: 1, boxId: seed.id, revision: 0, price: raw.price, active: raw.active }, seed.id);
        return boxFromPricing(seed, pricing, raw.catalogRevision);
      });
      // Shared pure utilities retain the same exported array reference; React consumers receive a new snapshot.
      PRODUCTS.splice(0, PRODUCTS.length, ...next);
      HAMPER_BOXES.splice(0, HAMPER_BOXES.length, ...boxes);
      version.current = data.version;
      setProducts(next);
    } catch { /* A saved bag remains intact; server quotes fail closed if the authoritative store is unavailable. */ }
    finally { clearTimeout(timer); if (inFlight.current === controller) inFlight.current = null; }
  }, []);
  useEffect(() => {
    active.current = true;
    void refresh();
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 30_000);
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => { active.current = false; inFlight.current?.abort(); clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [refresh]);
  return <CatalogContext.Provider value={{ products, refresh }}>{children}</CatalogContext.Provider>;
}
export const useCatalogProducts = () => useContext(CatalogContext).products;
export const useCatalogRefresh = () => useContext(CatalogContext).refresh;
