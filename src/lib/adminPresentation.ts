type AdminLanguage = 'en' | 'ur' | 'ar';
const dateLocales: Record<AdminLanguage, string> = { en: 'en-PK', ur: 'ur-PK', ar: 'ar-PK' };

/** Render scalar data without inventing a value for missing or malformed fields. */
export function adminDisplayText(value: unknown, fallback = '—'): string {
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return fallback;
}

/** Quoting CSV does not neutralize spreadsheet formulas; text gets its own guard. */
export function csvCell(value: unknown): string {
  let text = typeof value === 'number' && Number.isFinite(value) ? String(value)
    : typeof value === 'string' ? value
    : typeof value === 'boolean' ? String(value) : '';
  text = text.replace(/\u0000/g, '');
  if (typeof value === 'string' && /^[\s\u0000-\u001f]*[=+\-@]/u.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** UTF-8 BOM preserves Urdu/Arabic names in common spreadsheet importers. */
export function createAdminCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  return `\uFEFF${[headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

export function adminTimestamp(value: unknown): number | null {
  let timestamp: number;
  if (value instanceof Date) timestamp = value.getTime();
  else if (typeof value === 'number') timestamp = value;
  else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)) timestamp = Date.parse(value);
  else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const seconds = record.seconds ?? record._seconds;
    if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
    timestamp = seconds * 1000;
  } else return null;
  return Number.isFinite(timestamp) && !Number.isNaN(new Date(timestamp).getTime()) ? timestamp : null;
}

export function formatAdminDate(value: unknown, language: AdminLanguage = 'en'): string {
  const timestamp = adminTimestamp(value);
  if (timestamp === null) return '—';
  return new Intl.DateTimeFormat(dateLocales[language], {
    timeZone: 'Asia/Karachi', year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(timestamp);
}

export function formatAdminCurrency(value: unknown): string {
  const amount = typeof value === 'number' ? value
    : typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : NaN;
  if (!Number.isFinite(amount) || amount < 0) return '—';
  return `Rs. ${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Phone links allow a telephone number, never an arbitrary URL or URI. */
export function adminPhoneHref(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!/^\+?[\d ()-]+$/.test(text)) return null;
  const normalized = text.replace(/[ ()-]/g, '');
  if (!/^\+?\d{7,15}$/.test(normalized)) return null;
  return `tel:${normalized}`;
}
