import type { TaxonomyEntry } from '../lib/catalogConfiguration';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { PRODUCTS } from '../data/products';
import { apiUrl } from '../lib/apiUrl';
import { pricingFromLegacy, productFromPricing } from '../lib/catalogSchema';
import type { Product } from '../types';
import { HAMPER_BOXES, type HamperBox } from '../lib/hamperCatalog';
import { HAMPER_BOX_SEEDS, boxFromPricing, validateHamperBoxPricing } from '../lib/hamperBoxSchema';

const seeds = PRODUCTS.map(product => ({ ...product }));
const CatalogContext = createContext({ products: PRODUCTS, hamperBoxes: HAMPER_BOXES, taxonomy: [] as TaxonomyEntry[], hiddenTaxonomy: [] as string[], refresh: async (_options?: { force?: boolean }) => {} });
export function CatalogProvider({ children, initialProducts, initialTaxonomy }: { children: ReactNode; initialProducts?: Product[]; initialTaxonomy?: TaxonomyEntry[] }) {
  const [products, setProducts] = useState<Product[]>(() => initialProducts || PRODUCTS);
  const [hamperBoxes, setHamperBoxes] = useState<HamperBox[]>(() => [...HAMPER_BOXES]);
  const [taxonomy,setTaxonomy]=useState<TaxonomyEntry[]>(initialTaxonomy||[]);
  const [hiddenTaxonomy,setHiddenTaxonomy]=useState<string[]>([]);
  const taxonomyFlight=useRef<AbortController|null>(null);
  const active = useRef(false);
  const inFlight = useRef<AbortController | null>(null);
  const version = useRef('');
  const refresh = useCallback(async (options?: { force?: boolean }) => {
    if (inFlight.current) return;
    const controller = new AbortController(); inFlight.current = controller;
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      // Independent bounded request: category settings cannot hold back catalog prices.
      taxonomyFlight.current?.abort();const tc=new AbortController();taxonomyFlight.current=tc;
      const taxonomyTimer=setTimeout(()=>tc.abort(),10000);
      void fetch(apiUrl('/api/catalog/taxonomy'), {signal:tc.signal,credentials:'omit',cache:'no-cache'})
        .then(async response=>{if(!response.ok)return;const data=await response.json();if(active.current&&!tc.signal.aborted&&Array.isArray(data.taxonomy)){
          setTaxonomy(data.taxonomy.filter((x:any)=>typeof x.id==='string'&&x.visible===true));
          setHiddenTaxonomy(Array.isArray(data.hiddenTaxonomy)?data.hiddenTaxonomy.filter((x:any)=>typeof x.id==='string'&&x.type!=='occasion').map((x:any)=>x.id):[]);
        }}).catch(()=>{}).finally(()=>{clearTimeout(taxonomyTimer);if(taxonomyFlight.current===tc)taxonomyFlight.current=null;});
      const response = await fetch(apiUrl('/api/catalog'), { signal: controller.signal, credentials: 'omit', cache: 'no-cache', headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const data = await response.json();
      if (!active.current || controller.signal.aborted || !Array.isArray(data.products) || typeof data.version !== 'string' || (data.version === version.current && !options?.force)) return;
      // Revalidate the public adapter and retain source-owned descriptive metadata only.
      const handledIds = new Set<string>();
      const next: Product[] = [];

      for (const seed of seeds) {
        handledIds.add(seed.id);
        const raw = data.products.find((product: Product) => product.id === seed.id);
        if (!raw) {
          next.push({ ...seed, active: false, prices: {}, variants: [], allowCustomWeight: false, catalogRevision: 'unlisted' });
          continue;
        }
        if (typeof raw.catalogRevision !== 'string') throw new Error('INVALID_PUBLIC_CATALOG');
        if (raw.active === false && Object.keys(raw.prices || {}).length === 0) {
          next.push({ ...seed, active: false, prices: {}, variants: [], allowCustomWeight: false, catalogRevision: raw.catalogRevision });
        } else {
          const effectiveSeed = raw.commerce ? { ...seed, commerce: raw.commerce } : seed;
          const fromPricing = productFromPricing(effectiveSeed, pricingFromLegacy(raw, effectiveSeed), raw.catalogRevision);
          next.push({
            ...fromPricing,
            ...raw,
            prices: fromPricing.prices,
            variants: fromPricing.variants,
          });
        }
      }

      // Append newly created dynamic products absent from compiled seeds
      for (const raw of data.products) {
        if (!handledIds.has(raw.id) && raw.id) {
          handledIds.add(raw.id);
          next.push(raw);
        }
      }
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
      setHamperBoxes(boxes);
    } catch { /* A saved bag remains intact; server quotes fail closed if the authoritative store is unavailable. */ }
    finally { clearTimeout(timer); if (inFlight.current === controller) inFlight.current = null; }
  }, []);
  useEffect(() => {
    active.current = true;
    void refresh();
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 30_000);
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => { active.current = false; inFlight.current?.abort(); taxonomyFlight.current?.abort(); clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [refresh]);
  return <CatalogContext.Provider value={{ products, hamperBoxes, taxonomy, hiddenTaxonomy, refresh }}>{children}</CatalogContext.Provider>;
}
export const useCatalogProducts = () => useContext(CatalogContext).products;
export const useCatalogHamperBoxes = () => useContext(CatalogContext).hamperBoxes || HAMPER_BOXES;
export const useCatalogRefresh = () => useContext(CatalogContext).refresh;

export const useCatalogTaxonomy = () => useContext(CatalogContext).taxonomy;

export const useCatalogHiddenTaxonomy = () => useContext(CatalogContext).hiddenTaxonomy;
