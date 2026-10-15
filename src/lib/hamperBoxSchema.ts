import { HAMPER_BOXES, type HamperBox } from './hamperCatalog';
import { CatalogError } from './catalogSchema';
export const HAMPER_BOX_SEEDS = HAMPER_BOXES.map(box => ({ ...box }));
export interface HamperBoxPricing { schemaVersion: 1; boxId: string; revision: number; price: number; active: boolean }
export interface HamperBoxRecord { pricing: HamperBoxPricing; version: string; updatedAt: string | null }
export function validateHamperBoxPricing(value: unknown, boxId: string): HamperBoxPricing {
  const v = value as HamperBoxPricing;
  if (!HAMPER_BOX_SEEDS.some(box => box.id === boxId)) throw new CatalogError('UNKNOWN_HAMPER_BOX', 404);
  if (!v || v.schemaVersion !== 1 || v.boxId !== boxId || !Number.isSafeInteger(v.revision) || v.revision < 0
    || !Number.isSafeInteger(v.price) || v.price <= 0 || v.price > 10_000_000 || typeof v.active !== 'boolean') throw new CatalogError('INVALID_HAMPER_BOX');
  return { schemaVersion: 1, boxId, revision: v.revision, price: v.price, active: v.active };
}
export function boxFromPricing(seed: HamperBox, pricing: HamperBoxPricing, version: string): HamperBox {
  return { ...seed, price: pricing.price, active: pricing.active, catalogRevision: version };
}
