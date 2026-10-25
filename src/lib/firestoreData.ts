/** Remove absent fields before persistence without flattening Firestore SDK values. */
export function sanitizeFirestoreData<T>(value: T): T {
  const ancestors = new WeakSet<object>();
  const clean = (entry: unknown): unknown => {
    if (entry === null || typeof entry !== 'object') return entry;
    const prototype = Object.getPrototypeOf(entry);
    // Dates, Timestamp, FieldValue, GeoPoint and DocumentReference retain their SDK identity.
    if (!Array.isArray(entry) && prototype !== Object.prototype && prototype !== null) return entry;
    if (ancestors.has(entry)) throw new TypeError('Cyclic Firestore payload');
    ancestors.add(entry);
    const result = Array.isArray(entry)
      ? Array.from(entry, item => item === undefined ? null : clean(item))
      : Object.fromEntries(Object.entries(entry).filter(([, item]) => item !== undefined).map(([key, item]) => [key, clean(item)]));
    ancestors.delete(entry);
    return result;
  };
  return clean(value) as T;
}
