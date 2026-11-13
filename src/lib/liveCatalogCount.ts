import type { Firestore } from 'firebase-admin/firestore';
import { PRODUCTS } from '../data/products';
import intake1110 from '../data/catalogIntake20261110.json';
import intake1113 from '../data/catalogIntake20261113.json';

/** Read-only census of the live `products` collection against what the repository knows about. */
export async function countLiveCatalog(db: Firestore) {
  const snap = await db.collection('products').get();
  const known = new Map<string, string>();
  for (const p of PRODUCTS) known.set(p.id, 'compiled seed');
  for (const p of intake1110.newProducts) known.set(p.id, 'intake 20261110');
  for (const p of intake1113.newProducts) known.set(p.id, 'intake 20261113');
  const byCategory: Record<string, number> = {};
  const byState = { published: 0, draft: 0, archived: 0, inactive: 0 };
  const notInRepo: Array<{ id: string; category: string; name: string; status: string }> = [];
  const seen = new Set<string>();
  for (const doc of snap.docs) {
    const d = doc.data() as Record<string, any>;
    seen.add(doc.id);
    byCategory[String(d.category || 'unknown')] = (byCategory[String(d.category || 'unknown')] || 0) + 1;
    const status = d.status === 'draft' ? 'draft' : d.status === 'archived' ? 'archived' : d.active === false ? 'inactive' : 'published';
    byState[status] += 1;
    if (!known.has(doc.id)) notInRepo.push({ id: doc.id, category: String(d.category || ''), name: String(d.name_en || d.name || ''), status });
  }
  const missingFromLive = [...known.keys()].filter(id => !seen.has(id));
  return { total: snap.docs.length, byState, byCategory, repoKnown: known.size, notInRepoCount: notInRepo.length, notInRepo, repoItemsNotLive: missingFromLive.length, missingFromLive };
}
