import type { Firestore } from 'firebase-admin/firestore';
import manifest from '../data/catalogIntake20261113.json';
import { PRODUCTS } from '../data/products';
import { createAdminProduct } from './catalogStore';
import { normalizeCommerceInput, validateDynamicProduct } from './catalogSchema';
import { enrichIntakeProduct } from './catalogIntakeEnrich';

/** One-time owner intake. Existing Firestore products remain the only live authority. */
export function intakeProducts20261113() {
  const protectedIds = new Set(PRODUCTS.map(product => product.id));
  const ids = new Set<string>();
  return manifest.newProducts.map(source => {
    if (protectedIds.has(source.id) || ids.has(source.id)) throw new Error('INTAKE_ID_COLLISION');
    ids.add(source.id);
    if (source.status !== 'draft' || source.active !== false) throw new Error('INTAKE_MUST_START_AS_DRAFT');
    const body = normalizeCommerceInput(enrichIntakeProduct(structuredClone(source) as Record<string, any>) as any);
    validateDynamicProduct(body);
    return body;
  });
}

export async function importIntake20261113(options: { db: Firestore | null; actorUid?: string; execute?: boolean }) {
  const products = intakeProducts20261113();
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
