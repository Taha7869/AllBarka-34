import type { Firestore } from 'firebase-admin/firestore';
import manifest from '../data/catalogIntake20261110.json';
import { PRODUCTS } from '../data/products';
import { createAdminProduct } from './catalogStore';
import { normalizeCommerceInput, validateDynamicProduct } from './catalogSchema';
import overlay from '../data/catalogIntake20261110Overlay.json';
import { enrichIntakeProduct } from './catalogIntakeEnrich';

/** Add care copy and, where the batch had no rate, an owner-requested reference rate. */
function withOverlay(source: Record<string, any>) {
  const extra = (overlay.products as Record<string, any>)[source.id];
  if (!extra) return source;
  const { referenceRatePerBase, ...copy } = extra;
  const merged: Record<string, any> = { ...source, ...copy, origin_en: 'Hand-Packed in Pakistan', origin_ur: 'پاکستان میں ہاتھ سے پیک شدہ', origin_ar: 'معبأ يدويًا في باكستان' };
  if (referenceRatePerBase && merged.commerce.basePrice === null) {
    merged.commerce = { ...merged.commerce, basePrice: referenceRatePerBase };
    merged.quoteOnly = false; merged.orderMode = 'standard';
  }
  return enrichIntakeProduct(merged);
}

/** One-time owner intake. Existing Firestore products remain the only live authority. */
export function intakeProducts20261110() {
  const protectedIds = new Set(PRODUCTS.map(product => product.id));
  const ids = new Set<string>();
  return manifest.newProducts.map(source => {
    if (protectedIds.has(source.id) || ids.has(source.id)) throw new Error('INTAKE_ID_COLLISION');
    ids.add(source.id);
    if (source.status !== 'draft' || source.active !== false) throw new Error('INTAKE_MUST_START_AS_DRAFT');
    const body = normalizeCommerceInput(withOverlay(structuredClone(source) as Record<string, any>) as any);
    validateDynamicProduct(body);
    return body;
  });
}

export async function importIntake20261110(options: { db: Firestore | null; actorUid?: string; execute?: boolean }) {
  const products = intakeProducts20261110();
  if (options.execute && (!options.db || !options.actorUid)) throw new Error('INTAKE_AUTHORITY_REQUIRED');
  const result: Array<{ id: string; action: 'CREATE_DRAFT' | 'CREATED_DRAFT' | 'SKIP_EXISTING'; verified: boolean }> = [];
  for (const product of products) {
    const id = String(product.id);
    const existing = options.db ? await options.db.collection('products').doc(id).get() : null;
    if (existing?.exists) { result.push({ id, action: 'SKIP_EXISTING', verified: true }); continue; }
    if (!options.execute) { result.push({ id, action: 'CREATE_DRAFT', verified: Boolean(options.db) }); continue; }
    try {
      // Existing admin create service owns validation, transaction, revision and audit.
      // Its transaction rejects a concurrent creator; never replace with set/merge.
      await createAdminProduct({ db: options.db, body: product, actorUid: options.actorUid! });
      result.push({ id, action: 'CREATED_DRAFT', verified: true });
    } catch (error) {
      if ((error as { code?: string }).code !== 'PRODUCT_ALREADY_EXISTS') throw error;
      result.push({ id, action: 'SKIP_EXISTING', verified: true });
    }
  }
  return { batch: manifest.batch, mode: options.execute ? 'EXECUTE_CREATE_ONLY' : options.db ? 'READ_ONLY_PLAN' : 'OFFLINE_PLAN_UNVERIFIED', items: result, reusedIds: manifest.reuseExistingIds };
}
