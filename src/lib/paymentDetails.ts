export interface PaymentWallet {
  label: string;
  number: string;
}

export interface PublicPaymentDetails {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  raastId?: string;
  wallets: PaymentWallet[];
  version?: number | string;
  updatedAt?: string;
}

function cleanString(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanTimestamp(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim().slice(0, 64);
    return trimmed || undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (value && typeof value === 'object' && typeof (value as { toDate?: unknown }).toDate === 'function') {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function cleanVersion(value: unknown): number | string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const str = cleanString(value, 32);
  return str || undefined;
}

/**
 * Projects raw Firestore content/paymentDetails data into a trimmed, public-safe object.
 * - Trims every string (e.g. "Easypaisa " -> "Easypaisa").
 * - Omits empty raastId so blank Raast rows are never rendered.
 * - Drops incomplete wallet rows and any non-allowlisted / internal fields.
 * - Returns null when no transferable bank/Raast/wallet destination is configured.
 */
export function sanitizePaymentDetails(raw: unknown): PublicPaymentDetails | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;

  const bankName = cleanString(rec.bankName, 120);
  const accountTitle = cleanString(rec.accountTitle, 140);
  const accountNumber = cleanString(rec.accountNumber, 80);
  const iban = cleanString(rec.iban, 64);
  const raastId = cleanString(rec.raastId, 80) || undefined;

  const wallets: PaymentWallet[] = [];
  if (Array.isArray(rec.wallets)) {
    for (const item of rec.wallets) {
      if (wallets.length >= 10) break;
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const entry = item as Record<string, unknown>;
      const label = cleanString(entry.label, 80);
      const number = cleanString(entry.number, 80);
      if (label && number) {
        wallets.push({ label, number });
      }
    }
  }

  const hasBankChannel = Boolean(accountNumber || iban || raastId);
  if (!hasBankChannel && wallets.length === 0) {
    return null;
  }

  const version = cleanVersion(rec.version);
  const updatedAt = cleanTimestamp(rec.updatedAt);

  return {
    bankName,
    accountTitle,
    accountNumber,
    iban,
    ...(raastId ? { raastId } : {}),
    wallets,
    ...(version !== undefined ? { version } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}
