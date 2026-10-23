/** Isolated atomic database adapter for service/HTTP integration tests. No external credentials. */
export function memoryFirestore(initial: Record<string, unknown> = {}) {
  const records = new Map(Object.entries(initial).map(([key, value]) => [key, structuredClone(value)]));
  const snapshot = (path: string) => ({ id: path.split('/').at(-1)!, ref: reference(path), exists: records.has(path), data: () => structuredClone(records.get(path)) });
  const collection = (path: string): any => ({
    path, doc: (id: string) => reference(`${path}/${id}`),
    get: async () => ({ docs: [...records.keys()].filter(key => key.startsWith(`${path}/`) && key.slice(path.length + 1).indexOf('/') < 0).map(snapshot) }),
  });
  const reference = (path: string): any => ({ path, id: path.split('/').at(-1), get: async () => snapshot(path),
    set: async (value: unknown, options?: { merge: boolean }) => records.set(path, structuredClone(options?.merge ? { ...(records.get(path) as object || {}), ...(value as object) } : value)),
    collection: (id: string) => collection(`${path}/${id}`) });
  const db: any = {
    collection, getAll: async (...refs: any[]) => refs.map(ref => snapshot(ref.path)),
    runTransaction: async (execute: (transaction: any) => Promise<unknown>) => {
      const pending: Array<() => void> = [];
      const transaction = { get: async (ref: any) => snapshot(ref.path), getAll: async (...refs: any[]) => refs.map(ref => snapshot(ref.path)),
        set: (ref: any, value: unknown, options?: { merge: boolean }) => { pending.push(() => records.set(ref.path, structuredClone(options?.merge ? { ...(records.get(ref.path) as object || {}), ...(value as object) } : value))); },
      };
      const result = await execute(transaction);
      for (const write of pending) write();
      return result;
    },
  };
  return { db, records };
}
