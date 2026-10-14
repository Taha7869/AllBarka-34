import assert from 'node:assert/strict';
import type { Firestore } from 'firebase-admin/firestore';
import { PRODUCTS } from '../src/data/products';
import { HAMPER_BOXES } from '../src/lib/hamperCatalog';
import { defaultProductPricing } from '../src/lib/catalogPricing';

export class CatalogFirestoreFixture {
  records = new Map<string, any>();
  reads: string[] = [];
  listeners = new Map<string, Set<{ next: (value: any) => void; error: () => void }>>();
  failAudit = false;
  tail = Promise.resolve();
  seed() {
    for (const product of PRODUCTS) this.records.set(`products/${product.id}`, { ...defaultProductPricing(product), revision: 0 });
    for (const box of HAMPER_BOXES) this.records.set(`catalogBoxes/${box.id}`, { price: box.price, active: true, revision: 0 });
    return this;
  }
  ref(path: string): any { return { path, id: path.split('/').at(-1), get: async () => this.snap(path), collection: (name: string) => this.collection(`${path}/${name}`) }; }
  snap(path: string) { return { ref: this.ref(path), id: path.split('/').at(-1), exists: this.records.has(path), data: () => structuredClone(this.records.get(path)) }; }
  collection(path: string) {
    const make = (cap = Infinity, order = '', filters: Array<[string, unknown]> = []): any => {
      const query = {
        doc: (id: string) => this.ref(`${path}/${id}`),
        limit: (count: number) => make(count, order, filters),
        orderBy: (field: string) => make(cap, field, filters),
        where: (field: string, _operator: string, value: unknown) => make(cap, order, [...filters, [field, value]]),
        get: async () => {
          const docs = [...this.records.keys()].filter(key => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/'))
            .filter(key => filters.every(([field, value]) => this.records.get(key)[field] === value))
            .sort((a, b) => order ? String(this.records.get(b)[order]).localeCompare(String(this.records.get(a)[order])) : 0)
            .slice(0, cap).map(key => this.snap(key));
          return { docs, empty: docs.length === 0, size: docs.length };
        },
        onSnapshot: (next: (value: any) => void, error: () => void) => {
          const listener = { next, error }; const group = this.listeners.get(path) || new Set(); group.add(listener); this.listeners.set(path, group);
          queueMicrotask(() => void query.get().then(next));
          return () => { group.delete(listener); };
        },
      }; return query;
    }; return make();
  }
  emit(path: string) { return this.collection(path).get().then((snapshot: any) => { this.listeners.get(path)?.forEach(listener => listener.next(snapshot)); }); }
  async runTransaction<T>(operation: (transaction: any) => Promise<T>): Promise<T> {
    const result = this.tail.then(async () => {
      const writes: Array<() => void> = [];
      const value = await operation({
        get: async (ref: any) => { assert.equal(writes.length, 0, 'Firestore reads must precede writes'); this.reads.push(ref.path); return this.snap(ref.path); },
        set: (ref: any, data: any, options?: { merge?: boolean }) => {
          if (this.failAudit && ref.path.startsWith('catalogPriceAudits/')) throw new Error('Audit failed');
          writes.push(() => this.records.set(ref.path, options?.merge ? { ...this.records.get(ref.path), ...structuredClone(data) } : structuredClone(data)));
        },
        create: (ref: any, data: any) => { writes.push(() => this.records.set(ref.path, structuredClone(data))); },
        update: (ref: any, data: any) => { writes.push(() => this.records.set(ref.path, { ...this.records.get(ref.path), ...structuredClone(data) })); },
      });
      writes.forEach(write => write());
      return value;
    });
    this.tail = result.then(() => undefined, () => undefined); return result;
  }
  get db() { return this as unknown as Firestore; }
}
