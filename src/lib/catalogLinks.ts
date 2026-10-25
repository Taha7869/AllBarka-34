import type { Product } from '../types';

export function readSharedSelections(value: string | null, products: Product[]): string[] | null {
  if (value === null) return null;
  if (value.length > 2000) return [];
  const known = new Set(products.map(product => product.id));
  return [...new Set(value.split(',').filter(id => known.has(id)))].slice(0, 50);
}

export function selectionLink(origin: string, ids: string[], products: Product[]): string {
  const safe = readSharedSelections(ids.join(','), products) || [];
  const url = new URL('/shop', origin);
  url.searchParams.set('shared', safe.join(','));
  return url.toString();
}

export async function shareOrCopy(title: string, url: string): Promise<'shared' | 'copied' | 'cancelled' | 'manual'> {
  if (navigator.share) {
    try { await navigator.share({ title, url }); return 'shared'; }
    catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'; }
  }
  try { await navigator.clipboard.writeText(url); return 'copied'; }
  catch { return 'manual'; }
}
