/** Provider IDs are public configuration, never arbitrary script URLs. */
export const validMeasurementId = (value: unknown): value is string => typeof value === 'string' && /^G-[A-Z0-9]{5,20}$/.test(value);
