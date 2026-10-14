import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { orderSearchPrefixes, invalidateAdminOrderMetrics, validateAdminOrderId } from './adminOperations';

/** Bounded/resumable migration. Only derived search fields change; every write rereads the current order. */
export async function backfillOrderSearch(db: Firestore, options: { execute?: boolean; maxPages?: number; afterId?: string } = {}) {
  const maxPages = options.maxPages ?? 10;
  if (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 1000) throw new Error('INVALID_BACKFILL_LIMIT');
  let cursor = options.afterId ? validateAdminOrderId(options.afterId) : undefined;
  let scanned = 0, candidates = 0, updated = 0, pages = 0, complete = false;
  for (; pages < maxPages; pages++) {
    let query = db.collection('orders').orderBy(FieldPath.documentId(), 'asc').limit(200);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    for (const document of snapshot.docs) {
      scanned++; cursor = document.id;
      const data = document.data();
      const prefixes = orderSearchPrefixes({ orderId: document.id, customer: data.customer });
      if (data.searchVersion === 1 && JSON.stringify(data.searchPrefixes) === JSON.stringify(prefixes)) continue;
      candidates++;
      if (!options.execute) continue;
      const changed = await db.runTransaction(async transaction => {
        const latest = await transaction.get(document.ref);
        if (!latest.exists) return false;
        const value = latest.data()!;
        const next = orderSearchPrefixes({ orderId: document.id, customer: value.customer });
        if (value.searchVersion === 1 && JSON.stringify(value.searchPrefixes) === JSON.stringify(next)) return false;
        transaction.update(document.ref, { searchPrefixes: next, searchVersion: 1 });
        return true;
      });
      if (changed) updated++;
    }
    if (snapshot.docs.length < 200) { complete = true; pages++; break; }
  }
  if (updated) invalidateAdminOrderMetrics(db);
  return { dryRun: !options.execute, scanned, candidates, updated, pages, complete, afterId: complete ? null : cursor ?? null };
}
