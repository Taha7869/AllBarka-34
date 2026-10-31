import { PRODUCTS } from '../data/products';
import type { Product } from '../types';
import { resolveAuthoritativeKgRate } from './filledGiftPricing';

export const CUSTOM_HAMPER_PRODUCT_ID = 'custom-hamper';
export const HAMPER_PORTION_GRAMS = 200;
export const HAMPER_SELECTION_IDS = ['pista', 'kaju', 'badam', 'akhroot', 'khubani', 'alubukhara', 'kishmish', 'khajoor'] as const;

export interface HamperBox { id: 'box-wood' | 'box-velvet' | 'box-tin'; name_en: string; name_ur: string; name_ar: string; price: number; minSelections: number; maxSelections: number; image: string; active?: boolean; catalogRevision?: string }
export const HAMPER_BOXES: HamperBox[] = [
  { id: 'box-wood', name_en: 'Sheesham Artisan Wooden Chest', name_ur: 'شیشم کی کاریگرانہ لکڑی کی صندوقچی', name_ar: 'صندوق خشبي حرفي من خشب الشيشم', price: 1800, minSelections: 4, maxSelections: 6, image: '/images/generated/hamper-sheesham-chest-v1.webp' },
  { id: 'box-velvet', name_en: 'Royal Emerald Velvet Coffer', name_ur: 'شاہی زمردی مخملی صندوقچی', name_ar: 'صندوق ملكي من المخمل الزمردي', price: 1400, minSelections: 3, maxSelections: 5, image: '/images/generated/hamper-emerald-coffer-v1.webp' },
  { id: 'box-tin', name_en: 'Heritage Gold Keepsake Tin', name_ur: 'سنہری یادگاری دھاتی ڈبہ', name_ar: 'علبة تذكارية ذهبية معدنية', price: 950, minSelections: 3, maxSelections: 4, image: '/images/generated/hamper-gold-tin-v1.webp' },
];

export interface HamperConfiguration {
  version: 1;
  boxId: typeof HAMPER_BOXES[number]['id'];
  selections: string[];
  recipientName: string;
  giftMessage: string;
}

export interface ResolvedHamper {
  configuration: HamperConfiguration;
  unitPrice: number;
  massGrams: number;
  portion: string;
  name_en: string;
  name_ur: string;
  name_ar: string;
  image: string;
  packagingPrice?: number;
  ingredientsSubtotalPkr?: number;
  estimatedTotalPkr?: number;
  quantity?: number;
}

/** Retail cost for an actual canonical product's 200g hamper portion. */
export function hamperSelectionPrice(product: Product): number | null {
  const kgRate = resolveAuthoritativeKgRate(product);
  if (kgRate === null || !Number.isSafeInteger(kgRate) || kgRate <= 0) return null;
  const portionPrice = Math.round((kgRate * HAMPER_PORTION_GRAMS) / 1000);
  return Number.isSafeInteger(portionPrice) && portionPrice > 0 ? portionPrice : null;
}

/** Complete configuration equality preserves distinct recipients and messages. */
export function hamperCartKey(configuration: HamperConfiguration): string {
  return `${CUSTOM_HAMPER_PRODUCT_ID}:${JSON.stringify(configuration)}`;
}

function note(value: unknown, limit: number): string | null {
  if (typeof value !== 'string' || value.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return null;
  return value.replace(/\r\n?/g, '\n').trim();
}

/**
 * Shared storefront/server resolver. Never trusts browser prices, names or mass.
 * Reported weight is the contents' net weight; packaging has no invented mass.
 */
const MICRO = 1_000_000n;
const roundHalfUp = (numerator: bigint, denominator: bigint) => (numerator * 2n + denominator) / (denominator * 2n);

export function resolveHamper(value: unknown, products: Product[] = PRODUCTS, boxes: HamperBox[] = HAMPER_BOXES, quantity: number = 1): ResolvedHamper | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (input.version !== 1) return null;
  const box = boxes.find(option => option.id === input.boxId && option.active !== false && Number.isSafeInteger(option.price) && option.price > 0);
  if (!box || !Array.isArray(input.selections) || input.selections.length < box.minSelections || input.selections.length > box.maxSelections) return null;
  if (input.selections.some(id => typeof id !== 'string' || !HAMPER_SELECTION_IDS.includes(id as typeof HAMPER_SELECTION_IDS[number]))) return null;
  if (new Set(input.selections).size !== input.selections.length) return null;
  const selectedIds = input.selections as string[];
  const selections = HAMPER_SELECTION_IDS.filter(id => selectedIds.includes(id));
  const recipientName = note(input.recipientName, 100);
  const giftMessage = note(input.giftMessage, 500);
  if (recipientName === null || giftMessage === null || /\n|\t/.test(recipientName)) return null;

  const validQty = Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 1;

  let exact = 0n;
  for (const id of selections) {
    const product = products.find(candidate => candidate.id === id);
    if (!product) return null;
    const kgRate = resolveAuthoritativeKgRate(product);
    if (kgRate === null || !Number.isSafeInteger(kgRate) || kgRate <= 0) return null;
    exact += BigInt(kgRate) * 200_000n * BigInt(validQty);
  }

  const ingredientsSubtotal = roundHalfUp(exact, MICRO);
  if (ingredientsSubtotal <= 0n || ingredientsSubtotal > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  const ingredientsSubtotalPkr = Number(ingredientsSubtotal);

  const packagingTotal = box.price * validQty;
  const estimatedTotalPkr = ingredientsSubtotalPkr + packagingTotal;
  if (!Number.isSafeInteger(estimatedTotalPkr)) return null;

  const nominalUnitPrice = Math.round(estimatedTotalPkr / validQty);
  const configuration: HamperConfiguration = { version: 1, boxId: box.id, selections: [...selections], recipientName, giftMessage };
  return {
    configuration,
    unitPrice: nominalUnitPrice,
    massGrams: selections.length * HAMPER_PORTION_GRAMS,
    portion: `${selections.length} × ${HAMPER_PORTION_GRAMS}g`,
    name_en: `Custom ${box.name_en}`,
    name_ur: `خصوصی ${box.name_ur}`,
    name_ar: `${box.name_ar} حسب الطلب`,
    image: box.image,
    packagingPrice: box.price,
    ingredientsSubtotalPkr,
    estimatedTotalPkr,
    quantity: validQty,
  };
}

/** Packing details for the customer's explicit WhatsApp checkout action. */
export function hamperPackingLines(value: unknown, language: 'en' | 'ur' | 'ar' = 'en'): string[] {
  const hamper = resolveHamper(value);
  if (!hamper) return [];
  const names = hamper.configuration.selections.map(id => {
    const product = PRODUCTS.find(candidate => candidate.id === id)!;
    return `${product[`name_${language}`] || product.name_en} (${HAMPER_PORTION_GRAMS}g)`;
  });
  return [
    `  Contents: ${names.join(', ')}`,
    ...(hamper.configuration.recipientName ? [`  Recipient: ${hamper.configuration.recipientName}`] : []),
    ...(hamper.configuration.giftMessage ? [`  Gift card: ${hamper.configuration.giftMessage}`] : []),
  ];
}
