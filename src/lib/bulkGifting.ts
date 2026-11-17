import { calculateShipping, validateShippingCity } from './shippingPolicy';
import type { OrderStatus } from './serverOrderService';
import type { PricingSummary } from './pricing';
import type { ValidatedOrderItem } from './orderValidation';
import { ValidationError } from './validationError';
import { normalizePakistaniMobile } from './phoneRules';

export const MAX_BULK_RECIPIENTS = 50;
export const CORPORATE_QUOTE_THRESHOLD = 20;

export interface BulkRecipient {
  id: string;
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  giftMessage?: string;
}

export interface BulkChildShipment {
  shipmentId: string;
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  giftMessage?: string;
  shippingFee: number;
  status: OrderStatus;
}

/**
 * Validates a single recipient row.
 * Returns normalized recipient or throws ValidationError.
 */
export function validateBulkRecipient(input: any, index: number): BulkRecipient {
  if (!input || typeof input !== 'object') {
    throw new ValidationError(`Row ${index + 1}: Invalid recipient data.`, 'INVALID_RECIPIENT');
  }

  const recipientName = String(input.recipientName || input.name || '').trim();
  if (!recipientName) {
    throw new ValidationError(`Row ${index + 1}: Recipient name is required.`, 'RECIPIENT_NAME_REQUIRED');
  }
  if (recipientName.length > 120) {
    throw new ValidationError(`Row ${index + 1}: Recipient name exceeds 120 characters.`, 'RECIPIENT_NAME_TOO_LONG');
  }

  const rawPhone = String(input.phone || input.mobile || '').trim();
  const normalizedPhone = normalizePakistaniMobile(rawPhone);
  if (!normalizedPhone) {
    throw new ValidationError(
      `Row ${index + 1} (${recipientName}): Valid phone number required (Pakistani mobile 03XXXXXXXXX or +923XXXXXXXXX).`,
      'INVALID_PHONE'
    );
  }

  const address = String(input.address || input.street || '').trim();
  if (address.length < 10) {
    throw new ValidationError(
      `Row ${index + 1} (${recipientName}): Delivery address must be at least 10 characters.`,
      'INVALID_ADDRESS'
    );
  }
  if (address.length > 500) {
    throw new ValidationError(
      `Row ${index + 1} (${recipientName}): Address exceeds maximum length (500 characters).`,
      'ADDRESS_TOO_LONG'
    );
  }

  const cityInput = String(input.city || '').trim();
  let city: string;
  try {
    city = validateShippingCity(cityInput, true);
  } catch (err: any) {
    throw new ValidationError(`Row ${index + 1} (${recipientName}): ${err.message}`, 'INVALID_CITY');
  }

  const giftMessage = input.giftMessage ? String(input.giftMessage).trim().slice(0, 250) : undefined;
  const id = String(input.id || `rec-${index + 1}-${Date.now().toString(36)}`);

  return {
    id,
    recipientName,
    phone: normalizedPhone,
    address,
    city,
    giftMessage,
  };
}

/**
 * Robust CSV parser supporting quotes, commas within quotes, CRLF, and alternative header names.
 */
export function parseBulkRecipientsCsv(csvContent: string): {
  recipients: BulkRecipient[];
  errors: string[];
  exceedsMax: boolean;
} {
  const errors: string[] = [];
  const recipients: BulkRecipient[] = [];

  if (!csvContent || typeof csvContent !== 'string') {
    return { recipients, errors: ['CSV content is empty.'], exceedsMax: false };
  }

  // Remove UTF-8 BOM if present
  const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();
  if (!cleanContent) {
    return { recipients, errors: ['CSV file is empty.'], exceedsMax: false };
  }

  const lines = splitCsvLines(cleanContent);
  if (lines.length < 2) {
    return { recipients, errors: ['CSV must have a header row and at least one recipient row.'], exceedsMax: false };
  }

  const headerTokens = parseCsvRow(lines[0]).map((h) => h.toLowerCase().trim().replace(/[\s_-]+/g, ''));
  const nameIdx = headerTokens.findIndex((h) => ['name', 'recipient', 'recipientname', 'fullname'].includes(h));
  const phoneIdx = headerTokens.findIndex((h) => ['phone', 'mobile', 'cell', 'contact', 'phonenumber'].includes(h));
  const addressIdx = headerTokens.findIndex((h) => ['address', 'street', 'deliveryaddress', 'shippingaddress'].includes(h));
  const cityIdx = headerTokens.findIndex((h) => ['city', 'town', 'district'].includes(h));
  const messageIdx = headerTokens.findIndex((h) => ['message', 'giftmessage', 'note', 'card', 'cardmessage'].includes(h));

  if (nameIdx === -1 || phoneIdx === -1 || addressIdx === -1 || cityIdx === -1) {
    return {
      recipients,
      errors: [
        'Missing required columns in CSV header. Header must include: Name, Phone, Address, City (and optional Gift Message).',
      ],
      exceedsMax: false,
    };
  }

  let exceedsMax = false;
  const dataRows = lines.slice(1);

  if (dataRows.length > MAX_BULK_RECIPIENTS) {
    exceedsMax = true;
  }

  const rowsToProcess = dataRows.slice(0, MAX_BULK_RECIPIENTS);

  rowsToProcess.forEach((line, i) => {
    if (!line.trim()) return;
    const tokens = parseCsvRow(line);
    const rowObj: any = {
      recipientName: tokens[nameIdx] || '',
      phone: tokens[phoneIdx] || '',
      address: tokens[addressIdx] || '',
      city: tokens[cityIdx] || '',
      giftMessage: messageIdx !== -1 ? tokens[messageIdx] : undefined,
    };

    try {
      const validated = validateBulkRecipient(rowObj, i);
      recipients.push(validated);
    } catch (err: any) {
      errors.push(err.message);
    }
  });

  return { recipients, errors, exceedsMax };
}

/**
 * Generates sample CSV template for users to download.
 */
export function generateSampleBulkCsv(): string {
  const rows = [
    'Name,Phone,Address,City,Gift Message',
    'Zainab Khan,03001234567,"House 12, Street 4, DHA Phase 5",Lahore,"Wishing you joyous celebrations!"',
    'Ali Ahmed,03217654321,"Apartment 4B, Block 2, Clifton",Karachi,"Warmest regards and best wishes."',
    'Fatima Tariq,03339876543,"House 8, Street 15, Sector F-7/2",Islamabad,"Eid Mubarak to you and your family."',
  ];
  return rows.join('\r\n');
}

/**
 * Calculates per-recipient shipping and multi-address order totals.
 */
/**
 * Multi-address orders are priced as ONE order of every item x recipient count, so quantity
 * caps, stock, MOQ, wholesale tiers and coupons apply to the real total exactly once.
 */
export function scaleItemsForRecipients<T extends { quantity?: unknown }>(items: T[], recipientCount: number): T[] {
  if (!Array.isArray(items)) return items;
  if (!Number.isSafeInteger(recipientCount) || recipientCount < 1 || recipientCount > MAX_BULK_RECIPIENTS) {
    throw new ValidationError(`Maximum ${MAX_BULK_RECIPIENTS} recipients allowed per order.`, 'MAX_RECIPIENTS_EXCEEDED');
  }
  return items.map(item => ({ ...item, quantity: Number(item.quantity) * recipientCount }));
}

/** Validates the recipient list shape shared by the quote and the order transaction. */
export function validateRecipientList(recipients: unknown): BulkRecipient[] {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new ValidationError('Multi-address order must contain at least 1 recipient.', 'RECIPIENTS_REQUIRED');
  }
  if (recipients.length > MAX_BULK_RECIPIENTS) {
    throw new ValidationError(`Maximum ${MAX_BULK_RECIPIENTS} recipients allowed per order.`, 'MAX_RECIPIENTS_EXCEEDED');
  }
  return recipients.map((r, i) => validateBulkRecipient(r, i));
}

/**
 * `scaledSummary` is the canonical pricing of the scaled order (items x recipients).
 * Subtotal and discount are kept as priced; gift wrap is one fee per box; shipping is charged
 * per address on that address's equal share of the order.
 */
export function calculateBulkTotals(params: {
  scaledSummary: PricingSummary;
  recipients: BulkRecipient[];
  shippingMethodId?: string;
  orderId?: string;
  giftWrapping?: boolean;
}): {
  totals: PricingSummary;
  shipments: BulkChildShipment[];
} {
  const { scaledSummary, recipients, shippingMethodId = 'standard', orderId = 'ORD', giftWrapping = false } = params;
  const count = recipients.length;
  if (count === 0) {
    return { totals: scaledSummary, shipments: [] };
  }
  const perBoxWrap = giftWrapping ? (scaledSummary.giftWrapFee || 0) : 0;
  const giftWrapFee = perBoxWrap * count;
  const shareSubtotal = Math.round(scaledSummary.discountedSubtotal / count);
  const shareWeight = scaledSummary.shippingWeightGrams ? Math.ceil(scaledSummary.shippingWeightGrams / count) : scaledSummary.shippingWeightGrams;

  const shipments: BulkChildShipment[] = [];
  let totalShipping = 0;
  recipients.forEach((rec, idx) => {
    const fee = calculateShipping(shareSubtotal, shippingMethodId as any, perBoxWrap, rec.city, shareWeight);
    totalShipping += fee;
    shipments.push({
      shipmentId: `${orderId}-S${String(idx + 1).padStart(2, '0')}`,
      recipientName: rec.recipientName,
      phone: rec.phone,
      address: rec.address,
      city: rec.city,
      giftMessage: rec.giftMessage,
      shippingFee: fee,
      status: 'ORDER_RECEIVED',
    });
  });

  const totals: PricingSummary = {
    ...scaledSummary,
    shipping: totalShipping,
    giftWrapFee,
    total: scaledSummary.discountedSubtotal + totalShipping + giftWrapFee + (scaledSummary.addonsFee || 0),
    shippingRegion: 'nationwide',
  };
  return { totals, shipments };
}

// Helpers for CSV parsing with quote boundary support
function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') {
        i++; // skip \n in CRLF
      }
      lines.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function parseCsvRow(row: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      tokens.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  tokens.push(current.trim());
  return tokens;
}
