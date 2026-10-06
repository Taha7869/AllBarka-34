import type { CartItem, Product } from '../types';
import { resolveProductVariant } from './productVariants';
export interface CartLine { productId: string; weight: string; quantity: number; }
export interface SavedBox { id: string; name: string; lines: CartLine[]; }
export const SAVED_BOXES_KEY = 'allbarka_saved_boxes_v1';
export function validateCartLines(value: unknown, products: Product[]): CartLine[] {
  if (!Array.isArray(value) || value.length > 50) return [];
  const result = new Map<string, CartLine>();
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const product = products.find(item => item.id === entry.productId);
    const variant = product ? resolveProductVariant(product, entry.weight) : null;
    if (!product || !variant || !Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > 50) continue;
    const key = `${product.id}-${variant.label}`; const previous = result.get(key);
    result.set(key, { productId: product.id, weight: variant.label, quantity: Math.min(50, (previous?.quantity || 0) + entry.quantity) });
  }
  return [...result.values()];
}
export function cartLines(items: CartItem[], products: Product[]): CartLine[] { return validateCartLines(items.slice(0, 50).map(item => ({ productId: item.productId, weight: item.selectedWeight, quantity: item.quantity })), products); }
export function readSharedCart(raw: string | null, products: Product[]): CartLine[] { try { return raw && raw.length <= 16000 ? validateCartLines(JSON.parse(raw), products) : []; } catch { return []; } }
export function savedBoxes(value: unknown, products: Product[]): SavedBox[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).flatMap(box => {
    if (!box || typeof box.id !== 'string' || typeof box.name !== 'string') return [];
    const lines = validateCartLines(box.lines, products);
    return lines.length ? [{ id: box.id.slice(0, 80), name: box.name.slice(0, 60), lines }] : [];
  });
}
export function downloadText(filename: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
