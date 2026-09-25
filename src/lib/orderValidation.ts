import { PRODUCTS } from '../data/products';
import { calculateOrderSummary, PricingSummary } from './pricing';
import { ShippingMethodId } from '../types.ts';
import { BOX_OPTIONS, DRY_FRUIT_CANDIDATES, type HamperConfiguration } from '../config/hampers';

export class ValidationError extends Error {
  code: string;
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
  }
}

export interface ValidatedOrderItem {
  id: string; // composite cart item id, e.g. "pista-250g"
  productId: string; // canonical product id, e.g. "pista"
  name: string;
  selectedWeight: string;
  quantity: number;
  price: number; // authoritative price per unit in PKR
  earnedPoints: number;
  hamper?: HamperConfiguration;
}

export interface ValidatedOrder {
  items: ValidatedOrderItem[];
  summary: PricingSummary;
  earnedPoints: number;
}

export interface CustomerInput {
  name: string;
  phone: string;
  address: string;
  city: string;
  paymentMethod: string;
  deliverySlot?: string;
  giftWrapping?: boolean;
  giftMessage?: string;
  instructions?: string;
}

/**
 * Normalizes and strictly validates Pakistani mobile phone numbers.
 * Accepts formats: 03XXXXXXXXX, +923XXXXXXXXX, 00923XXXXXXXXX, with spaces or hyphens.
 * Returns normalized 11-digit canonical form: "03XXXXXXXXX".
 */
export function normalizeAndValidatePkPhone(rawPhone: unknown): { valid: boolean; normalized: string; error?: string } {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: false, normalized: '', error: 'Phone number is required.' };
  }

  const clean = rawPhone.replace(/[\s\-\(\)\.]/g, '');

  let standardized = clean;
  if (standardized.startsWith('+92')) {
    standardized = '0' + standardized.slice(3);
  } else if (standardized.startsWith('0092')) {
    standardized = '0' + standardized.slice(4);
  } else if (standardized.startsWith('92') && standardized.length === 12) {
    standardized = '0' + standardized.slice(2);
  }

  const pkMobileRegex = /^03\d{9}$/;
  if (!pkMobileRegex.test(standardized)) {
    return {
      valid: false,
      normalized: '',
      error: 'Please enter a valid 11-digit Pakistani mobile number (e.g., 03160666083 or +923160666083).'
    };
  }

  return { valid: true, normalized: standardized };
}

/**
 * Validates customer details and payment method.
 * Throws ValidationError on any failing constraint.
 */
export function validateCustomerDetails(input: Partial<CustomerInput>): CustomerInput & { phone: string } {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length < 3) {
    throw new ValidationError('Recipient name must be at least 3 characters long.', 'INVALID_NAME');
  }
  if (name.length > 80) {
    throw new ValidationError('Recipient name exceeds maximum allowed length (80 characters).', 'NAME_TOO_LONG');
  }

  const phoneRes = normalizeAndValidatePkPhone(input.phone);
  if (!phoneRes.valid) {
    throw new ValidationError(phoneRes.error || 'Invalid Pakistani phone number.', 'INVALID_PHONE');
  }

  const address = typeof input.address === 'string' ? input.address.trim() : '';
  if (!address || address.length < 8) {
    throw new ValidationError('Please enter a complete delivery address (minimum 8 characters).', 'INVALID_ADDRESS');
  }
  if (address.length > 300) {
    throw new ValidationError('Delivery address exceeds maximum allowed length (300 characters).', 'ADDRESS_TOO_LONG');
  }

  const city = typeof input.city === 'string' ? input.city.trim() : 'Lahore';
  if (!city || city.length < 2) {
    throw new ValidationError('Please enter a valid city name.', 'INVALID_CITY');
  }
  if (city.length > 60) {
    throw new ValidationError('City name exceeds maximum allowed length (60 characters).', 'CITY_TOO_LONG');
  }

  const paymentMethod = typeof input.paymentMethod === 'string' ? input.paymentMethod.trim().toLowerCase() : '';
  const allowedPayments = ['cod', 'bank'];
  if (!allowedPayments.includes(paymentMethod)) {
    throw new ValidationError(
      `Unsupported payment method "${input.paymentMethod}". Allowed methods: ${allowedPayments.join(', ')}`,
      'INVALID_PAYMENT_METHOD'
    );
  }

  const giftMessage = typeof input.giftMessage === 'string' ? input.giftMessage.trim().slice(0, 300) : '';
  const instructions = typeof input.instructions === 'string' ? input.instructions.trim().slice(0, 300) : '';

  return {
    name,
    phone: phoneRes.normalized,
    address,
    city,
    paymentMethod,
    deliverySlot: typeof input.deliverySlot === 'string' ? input.deliverySlot.slice(0, 80) : 'Fastest Dispatch',
    giftWrapping: Boolean(input.giftWrapping),
    giftMessage,
    instructions
  };
}

/**
 * Validates cart items, selected weights, quantities, and pricing against the product catalog.
 * Authoritative: browser prices are completely ignored.
 */
export function validateAndPriceOrder({
  items,
  shippingMethodId,
  discountCode,
  giftWrapping = false,
  isWholesale = false,
}: {
  items: any[];
  shippingMethodId: string;
  discountCode?: string | null;
  giftWrapping?: boolean;
  isWholesale?: boolean;
}): ValidatedOrder {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('Order must contain at least one item.', 'EMPTY_CART');
  }
  if (items.length > 50) {
    throw new ValidationError('Maximum allowable distinct cart items is 50.', 'TOO_MANY_ITEMS');
  }

  // Validate supported shipping method - NO silent fallback
  const validShippingMethods: ShippingMethodId[] = ['standard', 'express', 'sameday'];
  if (!shippingMethodId || !validShippingMethods.includes(shippingMethodId as ShippingMethodId)) {
    throw new ValidationError(
      `Unsupported shipping method "${shippingMethodId}". Allowed methods: ${validShippingMethods.join(', ')}.`,
      'INVALID_SHIPPING_METHOD'
    );
  }
  const resolvedShipping = shippingMethodId as ShippingMethodId;

  let totalEarnedPoints = 0;

  const validatedItems: ValidatedOrderItem[] = items.map((clientItem, idx) => {
    if (!clientItem || typeof clientItem !== 'object') {
      throw new ValidationError(`Invalid item object at position ${idx + 1}.`, 'INVALID_ITEM');
    }

    // Custom hamper is a structured product: never trust its browser-supplied price.
    const rawId = String(clientItem.productId || clientItem.id || '').trim();
    if (rawId.startsWith('custom-hamper-') || clientItem.hamper) {
      if (!/^custom-hamper-[A-Za-z0-9-]{1,80}$/.test(rawId) ||
          !clientItem.hamper || typeof clientItem.hamper !== 'object') {
        throw new ValidationError('Invalid custom hamper configuration.', 'INVALID_HAMPER');
      }
      const config = clientItem.hamper as HamperConfiguration;
      const box = BOX_OPTIONS.find(option => option.id === config.boxId);
      const ids = config.selectionIds;
      if (!box || !Array.isArray(ids) || ids.length < box.minSelections ||
          ids.length > box.maxSelections || new Set(ids).size !== ids.length) {
        throw new ValidationError('Invalid hamper box or selection count.', 'INVALID_HAMPER');
      }
      const selections = ids.map(id => DRY_FRUIT_CANDIDATES.find(item => item.id === id));
      if (selections.some(item => !item)) {
        throw new ValidationError('Unknown hamper selection.', 'INVALID_HAMPER');
      }
      const qty = Number(clientItem.quantity);
      if (!Number.isSafeInteger(qty) || qty < 1 || qty > 10) {
        throw new ValidationError('Hamper quantity must be 1 to 10.', 'INVALID_QUANTITY');
      }
      const recipientName = typeof config.recipientName === 'string' ? config.recipientName.trim() : '';
      const note = typeof config.note === 'string' ? config.note.trim() : '';
      if (recipientName.length > 80 || note.length > 300) {
        throw new ValidationError('Hamper card text is too long.', 'INVALID_HAMPER');
      }
      const price = box.price + selections.reduce((sum, selection) => sum + selection!.pricePer200g, 0);
      return {
        id: rawId,
        productId: 'custom-hamper',
        name: `Custom ${box.name}`,
        selectedWeight: `${ids.length}x 200g Selections (${selections.map(item => item!.name).join(', ')})`,
        quantity: qty,
        price,
        earnedPoints: 0,
        hamper: { boxId: box.id, selectionIds: [...ids], recipientName, note },
      };
    }
    // Resolve canonical product ID
    const strippedId = rawId.replace(/-(?:250g|500g|1kg|piece|box|pack|single|set)$/i, '');
    const product = PRODUCTS.find(
      p => p.id === clientItem.productId || p.id === rawId || p.id === strippedId
    );

    if (!product) {
      throw new ValidationError(
        `Product not found: ${clientItem.name || clientItem.productId || clientItem.id || `position ${idx + 1}`}`,
        'PRODUCT_NOT_FOUND'
      );
    }

    const weight = String(clientItem.selectedWeight || '250g').trim();
    const allowedWeights = product.prices ? Object.keys(product.prices) : [];

    let authoritativeUnitPrice = 0;
    if (isWholesale && product.wholesale) {
      authoritativeUnitPrice = product.wholesale;
    } else if (product.prices && typeof product.prices[weight] === 'number') {
      authoritativeUnitPrice = product.prices[weight];
    } else if (product.price) {
      authoritativeUnitPrice = product.price;
    } else if (allowedWeights.length > 0 && product.prices) {
      throw new ValidationError(
        `Invalid weight "${weight}" for product "${product.name}". Allowed weights: ${allowedWeights.join(', ')}`,
        'INVALID_WEIGHT'
      );
    } else {
      throw new ValidationError(`Pricing unavailable for product "${product.name}".`, 'PRICING_UNAVAILABLE');
    }

    // Validate quantity strictly: integer between 1 and 50 inclusive. Reject fractional, zero, negative or non-finite.
    const rawQty = clientItem.quantity;
    const numQty = typeof rawQty === 'number' ? rawQty : Number(rawQty);

    if (!Number.isFinite(numQty) || !Number.isInteger(numQty) || numQty < 1 || numQty > 50) {
      throw new ValidationError(
        `Invalid quantity for "${product.name}": must be an integer between 1 and 50 units.`,
        'INVALID_QUANTITY'
      );
    }
    const quantity = numQty;

    // Calculate loyalty points
    let pts = 0;
    if (!isWholesale && product.earnedPoints) {
      if (typeof product.earnedPoints === 'number') {
        pts = product.earnedPoints;
      } else if (product.earnedPoints[weight]) {
        pts = product.earnedPoints[weight];
      }
    }
    totalEarnedPoints += pts * quantity;

    return {
      id: `${product.id}-${weight}`,
      productId: product.id,
      name: product.name,
      selectedWeight: weight,
      quantity,
      price: authoritativeUnitPrice,
      earnedPoints: pts * quantity,
    };
  });

  const summary = calculateOrderSummary({
    items: validatedItems.map(i => ({ unitPrice: i.price, quantity: i.quantity })),
    shippingMethodId: resolvedShipping,
    couponCode: discountCode,
    giftWrapping,
  });

  return {
    items: validatedItems,
    summary,
    earnedPoints: totalEarnedPoints,
  };
}
