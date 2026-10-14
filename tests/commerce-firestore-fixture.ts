import assert from 'node:assert/strict';
import type { Firestore } from 'firebase-admin/firestore';

const copy = <T>(value: T): T => structuredClone(value);
const field = (value: any, path: string) => path.split('.').reduce((result, key) => result?.[key], value);

/** Serializable, bounded Firestore fixture with query cursors/aggregations and read-before-write transactions. */
export class CommerceFirestoreFixture {
  records = new Map<string, any>();
  documentReads = 0;
  aggregateReads = 0;
  transactionReads: string[] = [];
  requestedLimits: number[] = [];
  failAudit = false;
  retryOnce = false;
  writes = 0;
  tail = Promise.resolve();
  watches = new Set<{ path: string; query: any; next: (snapshot: any) => void; error: () => void }>();
  constructor(initial: Record<string, any> = {}) { for (const [path, value] of Object.entries(initial)) this.records.set(path, copy(value)); }
  doc(path: string) { return this.ref(path); }
  ref(path: string): any { return { path, id: path.split('/').at(-1), get: async () => { this.documentReads++; return this.snap(path); }, collection: (name: string) => this.collection(`${path}/${name}`) }; }
  snap(path: string): any { return { ref: this.ref(path), id: path.split('/').at(-1), exists: this.records.has(path), data: () => copy(this.records.get(path)) }; }
  collection(path: string): any {
    const make = (filters: Array<[string, string, any]> = [], orders: Array<[string, string]> = [], cap = Infinity, after?: any[]) => {
      const getValue = (document: any, name: string) => name === '__name__' ? document.id : field(document.data(), name);
      const collect = () => {
        let docs = [...this.records.keys()].filter(key => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/')).map(key => this.snap(key));
        docs = docs.filter(document => filters.every(([name, operator, value]) => {
          const actual = getValue(document, name);
          return actual !== undefined && (operator === '==' ? actual === value : operator === 'in' ? value.includes(actual)
            : operator === 'array-contains' ? Array.isArray(actual) && actual.includes(value)
            : operator === '<=' ? actual <= value : operator === '>=' ? actual >= value : operator === '>' ? actual > value : actual < value);
        }) && orders.every(([name]) => getValue(document, name) !== undefined));
        const compare = (values: any[], other: any[]) => { for (let i = 0; i < orders.length; i++) { const [_, direction] = orders[i]; const a = values[i], b = other[i]; if (a !== b) return (a < b ? -1 : 1) * (direction === 'desc' ? -1 : 1); } return 0; };
        const values = (document: any) => orders.map(([name]) => getValue(document, name));
        docs.sort((a, b) => compare(values(a), values(b)));
        if (after) docs = docs.filter(document => compare(values(document), after) > 0);
        return docs.slice(0, cap);
      };
      const query: any = {
        fixtureQuery: true, path,
        doc: (id: string) => this.ref(`${path}/${id}`),
        where: (name: string, operator: string, value: any) => make([...filters, [name, operator, value]], orders, cap, after),
        orderBy: (name: any, direction = 'asc') => make(filters, [...orders, [typeof name === 'string' ? name : '__name__', direction]], cap, after),
        limit: (count: number) => { this.requestedLimits.push(count); return make(filters, orders, count, after); },
        startAfter: (...values: any[]) => make(filters, orders, cap, values.length === 1 && values[0]?.ref ? orders.map(([name]) => getValue(values[0], name)) : values),
        get: async () => { const docs = collect(); this.documentReads += docs.length; return { docs, size: docs.length, empty: docs.length === 0 }; },
        aggregate: (spec: Record<string, any>) => ({ get: async () => {
          this.aggregateReads++; const docs = collect();
          const data = Object.fromEntries(Object.entries(spec).map(([name, entry]) => [name, entry.aggregateType === 'count' ? docs.length
            : docs.reduce((total, document) => { const amount = field(document.data(), entry._field); return total + (typeof amount === 'number' && Number.isFinite(amount) ? amount : 0); }, 0)]));
          return { data: () => data };
        } }),
        count: () => query.aggregate({ count: { aggregateType: 'count' } }),
        onSnapshot: (next: (value: any) => void, error: () => void) => { const watcher = { path, query, next, error }; this.watches.add(watcher); queueMicrotask(() => { if (this.watches.has(watcher)) void query.get().then(next); }); return () => { this.watches.delete(watcher); }; },
      };
      return query;
    };
    return make();
  }
  async notify(path: string) { await Promise.all([...this.watches].filter(watcher => watcher.path === path).map(async watcher => watcher.next(await watcher.query.get()))); }
  async runTransaction<T>(operation: (transaction: any) => Promise<T>): Promise<T> {
    const promise = this.tail.then(async () => {
      const run = async () => {
        const pending: Array<{ path: string; value: any; merge: boolean }> = [];
        const transaction = {
          get: async (reference: any) => { assert.equal(pending.length, 0, 'All reads must precede writes'); this.transactionReads.push(reference.path); return reference.fixtureQuery ? reference.get() : this.snap(reference.path); },
          set: (reference: any, value: any, options?: { merge?: boolean }) => {
            if (this.failAudit && /Audits\//.test(reference.path)) throw new Error('Audit failed');
            pending.push({ path: reference.path, value: copy(value), merge: options?.merge === true });
          },
          update: (reference: any, value: any) => { pending.push({ path: reference.path, value: copy(value), merge: true }); },
          create: (reference: any, value: any) => { assert.equal(this.records.has(reference.path), false); pending.push({ path: reference.path, value: copy(value), merge: false }); },
        };
        return { result: await operation(transaction), pending };
      };
      let result = await run();
      if (this.retryOnce) { this.retryOnce = false; result = await run(); }
      for (const write of result.pending) { this.records.set(write.path, write.merge ? { ...this.records.get(write.path), ...write.value } : write.value); this.writes++; }
      return result.result;
    });
    this.tail = promise.then(() => undefined, () => undefined);
    return promise;
  }
  get db() { return this as unknown as Firestore; }
}
