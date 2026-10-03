/** A bounded read-only probe verifies database access, never an order write. */
export async function probeCommerceDatabase(db: { doc: (path: string) => { get: () => Promise<unknown> } } | null, timeoutMs = 3000) {
  if (!db) return { connected: false, checked: false };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      db.doc('_health/commerce').get(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('DATABASE_PROBE_TIMEOUT')), timeoutMs); }),
    ]);
    return { connected: true, checked: true };
  } catch { return { connected: false, checked: true }; }
  finally { clearTimeout(timer); }
}
