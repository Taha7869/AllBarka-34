import type { Product } from '../types';
import { getProductImages } from '../data/productImages';
import { normalizeSearch, productSearchScore } from './catalogDiscovery';

export type CatalogIssue = 'id' | 'name' | 'portion' | 'image';
export interface AdminCatalogRow {
  product: Product;
  images: string[];
  portions: [string, number][];
  issues: CatalogIssue[];
}

export function isLocalCatalogImage(path: string): boolean {
  return /^\/images\/[a-zA-Z0-9_./-]+$/.test(path)
    && !path.split('/').some(segment => segment === '..' || segment === '.')
    && !path.includes('//');
}

export function getAdminCatalogSnapshot(products: Product[]) {
  const idCounts = new Map<string, number>();
  for (const product of products) idCounts.set(product.id, (idCounts.get(product.id) || 0) + 1);
  const rows: AdminCatalogRow[] = products.map(product => {
    const images = getProductImages(product);
    const portions = Object.entries(product.prices || {});
    const issues: CatalogIssue[] = [];
    if (!product.id?.trim() || idCounts.get(product.id) !== 1) issues.push('id');
    if (!product.name_en?.trim() || !product.name_ur?.trim() || !product.name_ar?.trim()
      || product.name_ur === product.name_en || product.name_ar === product.name_en) issues.push('name');
    if ((!portions.length && !product.quoteOnly) || portions.some(([weight, price]) => !weight.trim() || !Number.isFinite(price) || price <= 0)) issues.push('portion');
    if ((product.image !== null && !images.length) || images.some(path => !isLocalCatalogImage(path) || path.includes('product-placeholder'))) issues.push('image');
    return { product, images, portions, issues };
  });
  const assets = [...new Set(rows.flatMap(row => row.images))];
  return {
    rows, assets,
    categories: [...new Set(products.map(product => product.category))].sort(),
    productCount: products.length,
    imageCount: assets.length,
    portionCount: rows.reduce((count, row) => count + row.portions.length, 0),
    galleryCount: rows.filter(row => row.images.length > 1).length,
    issueCount: rows.reduce((count, row) => count + row.issues.length, 0),
  };
}

export function filterAdminCatalog(rows: AdminCatalogRow[], query: string, category: string): AdminCatalogRow[] {
  const search = normalizeSearch(query);
  return rows.filter(row => (!category || row.product.category === category)
    && (!search || normalizeSearch(row.product.id).includes(search) || productSearchScore(row.product, query) > 0));
}

export interface CatalogAssetResult {
  path: string;
  result: 'ok' | 'http' | 'type' | 'network' | 'timeout' | 'unsafe';
  status?: number;
}

/** Only runs on explicit request. Deduplicated, capped and cancellable; never follows redirects. */
export async function checkCatalogAssets(paths: string[], options: {
  signal: AbortSignal;
  onResult?: (result: CatalogAssetResult) => void;
  fetcher?: typeof fetch;
  concurrency?: number;
  timeoutMs?: number;
}): Promise<CatalogAssetResult[]> {
  const uniquePaths = [...new Set(paths)].slice(0, 256);
  const results: CatalogAssetResult[] = [];
  const fetcher = options.fetcher || fetch;
  const concurrency = Math.max(1, Math.min(4, Math.floor(options.concurrency || 4)));
  const timeoutMs = Math.max(50, Math.min(15_000, options.timeoutMs || 8_000));
  let next = 0;
  const record = (result: CatalogAssetResult) => {
    if (options.signal.aborted) return;
    results.push(result);
    options.onResult?.(result);
  };
  const worker = async () => {
    while (!options.signal.aborted && next < uniquePaths.length) {
      const path = uniquePaths[next++];
      if (!isLocalCatalogImage(path)) { record({ path, result: 'unsafe' }); continue; }
      const controller = new AbortController();
      const abort = () => controller.abort();
      options.signal.addEventListener('abort', abort, { once: true });
      let timedOut = false;
      const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
      try {
        if (options.signal.aborted) { controller.abort(); break; }
        const response = await fetcher(path, {
          method: 'HEAD', credentials: 'same-origin', cache: 'no-cache', redirect: 'error', signal: controller.signal,
        });
        const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() || '';
        record({ path, result: !response.ok ? 'http' : !contentType.startsWith('image/') ? 'type' : 'ok', status: response.status });
      } catch {
        if (!options.signal.aborted) record({ path, result: timedOut ? 'timeout' : 'network' });
      } finally {
        clearTimeout(timeout);
        options.signal.removeEventListener('abort', abort);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, uniquePaths.length) }, worker));
  return results;
}
