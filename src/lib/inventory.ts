import { PRODUCTS } from '../data/products';
import type { Product } from '../types';
import { CUSTOM_HAMPER_PRODUCT_ID, HAMPER_BOXES, HAMPER_PORTION_GRAMS, type HamperBox } from './hamperCatalog';

export const INVENTORY_COLLECTION = 'catalogInventory';
export const DEFAULT_UNLIMITED_STOCK = 9999;
export const MAX_INVENTORY_UNITS = 1_000_000_000;
export type InventoryUnit = 'g' | 'ml' | 'pack';
export interface InventoryPricing { mode: 'unlimited' | 'tracked'; available: number }
export interface InventoryTarget { id: string; kind: 'products' | 'boxes'; unit: InventoryUnit; target: Product | HamperBox }
export interface InventoryRecord extends InventoryPricing { id: string; kind: InventoryTarget['kind']; unit: InventoryUnit; revision: number; version: string; updatedAt: string | null }
export interface StockAllocation { id: string; kind: InventoryTarget['kind']; unit: InventoryUnit; units: number }
export interface InventoryReservation { status: 'RESERVED' | 'FULFILLED' | 'RELEASED'; allocations: StockAllocation[]; reservedAt: string; fulfilledAt?: string; releasedAt?: string }

export class InventoryError extends Error {
  constructor(public code: string, public httpStatus = 400) { super(code); this.name = 'InventoryError'; }
}
export function productInventoryUnit(product: Product): InventoryUnit {
  if (product.category === 'oils') return 'ml';
  if (product.isBundle || ['bundles', 'gift-boxes'].includes(product.category)) return 'pack';
  return Object.keys(product.prices).length && Object.keys(product.prices).every(portion => /^\d+(?:\.\d+)?\s*(g|kg)$/i.test(portion)) ? 'g' : 'pack';
}
export const INVENTORY_TARGETS: InventoryTarget[] = [...PRODUCTS.map(target => ({ id: target.id, kind: 'products' as const, unit: productInventoryUnit(target), target })),
  ...HAMPER_BOXES.map(target => ({ id: target.id, kind: 'boxes' as const, unit: 'pack' as const, target }))];
export function inventoryTarget(id: unknown): InventoryTarget {
  const value = typeof id === 'string' ? INVENTORY_TARGETS.find(target => target.id === id) : undefined;
  if (!value) throw new InventoryError('UNKNOWN_INVENTORY_TARGET', 404);
  return value;
}
export function validateInventory(raw: unknown, strict = false): InventoryPricing {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new InventoryError('INVALID_INVENTORY');
  const input = raw as Record<string, unknown>;
  if (strict && (Object.keys(input).length !== 2 || !Object.hasOwn(input, 'mode') || !Object.hasOwn(input, 'available'))) throw new InventoryError('INVALID_INVENTORY');
  if (!['tracked', 'unlimited'].includes(String(input.mode)) || !Number.isSafeInteger(input.available) || (input.available as number) < 0 || (input.available as number) > MAX_INVENTORY_UNITS
    || input.mode === 'unlimited' && input.available !== DEFAULT_UNLIMITED_STOCK) throw new InventoryError('INVALID_INVENTORY');
  return { mode: input.mode as InventoryPricing['mode'], available: input.available as number };
}
export function inventoryFromStored(raw: unknown): InventoryPricing { return raw === undefined ? { mode: 'unlimited', available: DEFAULT_UNLIMITED_STOCK } : validateInventory(raw); }

/** Inventory counts g, ml or individual packs; oil ml is not described as physical grams. */
export function orderStockRequirements(items: readonly { productId: string; selectedWeight: string; quantity: number; hamperConfiguration?: { boxId: string; selections: string[] } }[], sample?: { productId: string; grams: number }): StockAllocation[] {
  const allocations = new Map<string, StockAllocation>();
  const add = (id: string, units: number) => {
    const target = inventoryTarget(id);
    if (!Number.isSafeInteger(units) || units <= 0) throw new InventoryError('INVALID_INVENTORY_ALLOCATION');
    const previous = allocations.get(id)?.units || 0;
    if (previous + units > MAX_INVENTORY_UNITS) throw new InventoryError('INVALID_INVENTORY_ALLOCATION');
    allocations.set(id, { id, kind: target.kind, unit: target.unit, units: previous + units });
  };
  for (const item of items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) throw new InventoryError('INVALID_INVENTORY_ALLOCATION');
    if (item.productId === CUSTOM_HAMPER_PRODUCT_ID) {
      if (!item.hamperConfiguration) throw new InventoryError('INVALID_INVENTORY_ALLOCATION');
      add(item.hamperConfiguration.boxId, item.quantity);
      for (const id of item.hamperConfiguration.selections) add(id, HAMPER_PORTION_GRAMS * item.quantity);
      continue;
    }
    const target = inventoryTarget(item.productId);
    let units = item.quantity;
    if (target.unit !== 'pack') {
      const match = /^(?:Custom\s+)?(\d+(?:\.\d+)?)\s*(g|kg|ml)$/i.exec(item.selectedWeight);
      if (!match || target.unit === 'ml' !== (match[2].toLowerCase() === 'ml')) throw new InventoryError('INVALID_INVENTORY_ALLOCATION');
      units *= Number(match[1]) * (match[2].toLowerCase() === 'kg' ? 1000 : 1);
    }
    add(item.productId, units);
  }
  if (sample) {
    if (inventoryTarget(sample.productId).unit !== 'g') throw new InventoryError('INVALID_INVENTORY_ALLOCATION');
    add(sample.productId, sample.grams);
  }
  return [...allocations.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function validateStockCapacity(requirements: StockAllocation[], records: Map<string, unknown>) {
  for (const requirement of requirements) {
    const inventory = inventoryFromStored(records.get(requirement.id));
    if (inventory.mode === 'tracked' && inventory.available < requirement.units) throw new InventoryError('INSUFFICIENT_STOCK', 409);
  }
}
