import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sanitizeOrderForReorder,
  verifyPhoneLast4,
  type PublicOrderReorderResult,
} from '../src/lib/orderTrackingService';
import type { Product } from '../src/types';

// Mock catalog for deterministic testing
const mockLiveCatalog: Product[] = [
  {
    id: 'pista-roasted',
    name: 'Roasted Pistachios',
    slug: 'pista-roasted',
    category: 'Dry Fruits & Nuts',
    description: 'Crisp roasted pistachios',
    active: true,
    prices: {
      '250g': 1200,
      '500g': 2300,
      '1kg': 4400,
    },
    variants: [
      { label: '250g', price: 1200, available: true },
      { label: '500g', price: 2300, available: true },
      { label: '1kg', price: 4400, available: true },
    ],
  } as unknown as Product,
  {
    id: 'ajwa-dates',
    name: 'Madinah Ajwa Dates',
    slug: 'ajwa-dates',
    category: 'Dates',
    description: 'Fresh Ajwa dates',
    active: true,
    prices: {
      '500g': 3000,
      '1kg': 5800,
    },
    variants: [
      { label: '500g', price: 3000, available: false }, // Variant disabled!
      { label: '1kg', price: 5800, available: true },
    ],
  } as unknown as Product,
  {
    id: 'seasonal-honey',
    name: 'Sidr Honey Special',
    slug: 'seasonal-honey',
    category: 'Honey',
    description: 'Pure Sidr honey',
    active: false, // Inactive / Delisted!
    prices: {
      '500g': 3500,
    },
  } as unknown as Product,
  {
    id: 'luxury-custom-tin',
    name: 'Luxury Custom Tin',
    slug: 'luxury-custom-tin',
    category: 'Gifting',
    description: 'Quote only favor box',
    quoteOnly: true, // Quote only!
    prices: {
      '1unit': 5000,
    },
  } as unknown as Product,
];

test('Feature A: Phone verification rejects mismatched or malformed inputs', () => {
  assert.equal(verifyPhoneLast4('03001234567', '4567'), true);
  assert.equal(verifyPhoneLast4('+92 321 987-6543', '6543'), true);
  assert.equal(verifyPhoneLast4('04235876543', '6543'), true);
  assert.equal(verifyPhoneLast4('03001234567', '1234'), false);
  assert.equal(verifyPhoneLast4('03001234567', '456'), false);
  assert.equal(verifyPhoneLast4('03001234567', '45678'), false);
  assert.equal(verifyPhoneLast4(undefined, '4567'), false);
});

test('Feature A: Privacy Boundary Enforcement (Zero PII or payment details in reorder output)', () => {
  const sensitivePastItems = [
    {
      productId: 'pista-roasted',
      selectedWeight: '500g',
      quantity: 2,
      price: 2100, // Past price was 2100
      customerName: 'Muhammad Tariq',
      customerEmail: 'tariq@example.com',
      customerPhone: '03001234567',
      shippingAddress: 'House 42, Gulberg III, Lahore',
      totalPaid: 4500,
      paymentMethod: 'bank',
      adminNotes: 'VIP customer',
    },
  ];

  const result: PublicOrderReorderResult = sanitizeOrderForReorder(
    sensitivePastItems,
    mockLiveCatalog,
    'AB-20261118-ABC123'
  );

  assert.equal(result.success, true);
  assert.equal(result.orderId, 'AB-20261118-ABC123');
  assert.equal(result.items.length, 1);

  // Check that NO sensitive customer properties exist anywhere on the root or item
  const rootKeys = Object.keys(result);
  assert.deepEqual(rootKeys.sort(), ['items', 'orderId', 'success', 'unavailableItems'].sort());

  const item = result.items[0];
  assert.equal(item.productId, 'pista-roasted');
  assert.equal(item.name, 'Roasted Pistachios');
  assert.equal(item.weight, '500g');
  assert.equal(item.quantity, 2);
  assert.equal(item.currentUnitPrice, 2300); // Live price is 2300
  assert.equal(item.originalUnitPrice, 2100);
  assert.equal(item.priceChanged, true); // Detected price increase!

  // Ensure NO customer details leaked onto item
  const itemObj = item as unknown as Record<string, unknown>;
  assert.equal(itemObj.customerName, undefined);
  assert.equal(itemObj.customerEmail, undefined);
  assert.equal(itemObj.customerPhone, undefined);
  assert.equal(itemObj.shippingAddress, undefined);
  assert.equal(itemObj.totalPaid, undefined);
  assert.equal(itemObj.paymentMethod, undefined);
  assert.equal(itemObj.adminNotes, undefined);
});

test('Feature A: Accurate segregation of available vs unavailable catalog items', () => {
  const pastItems = [
    // 1. Available item (pista-roasted 500g)
    {
      productId: 'pista-roasted',
      selectedWeight: '500g',
      quantity: 1,
      price: 2300,
    },
    // 2. Disabled variant (ajwa-dates 500g has available: false)
    {
      productId: 'ajwa-dates',
      selectedWeight: '500g',
      quantity: 1,
      price: 3000,
    },
    // 3. Inactive product (seasonal-honey active: false)
    {
      productId: 'seasonal-honey',
      selectedWeight: '500g',
      quantity: 1,
      price: 3500,
    },
    // 4. Quote-only product (luxury-custom-tin quoteOnly: true)
    {
      productId: 'luxury-custom-tin',
      selectedWeight: '1unit',
      quantity: 1,
      price: 5000,
    },
    // 5. Completely deleted / discontinued product
    {
      productId: 'discontinued-old-box',
      selectedWeight: '1pc',
      quantity: 1,
      price: 1500,
    },
  ];

  const result = sanitizeOrderForReorder(pastItems, mockLiveCatalog, 'AB-20261118-XYZ789');

  // Available items: only pista-roasted
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].productId, 'pista-roasted');
  assert.equal(result.items[0].currentUnitPrice, 2300);

  // Unavailable items: 4 items with distinct clear reasons
  assert.equal(result.unavailableItems.length, 4);

  const unavailableReasons = new Map(result.unavailableItems.map(u => [u.productId, u.reason]));
  assert.equal(unavailableReasons.get('ajwa-dates'), 'variant_unavailable');
  assert.equal(unavailableReasons.get('seasonal-honey'), 'inactive');
  assert.equal(unavailableReasons.get('luxury-custom-tin'), 'quote_only');
  assert.equal(unavailableReasons.get('discontinued-old-box'), 'discontinued');
});

test('Feature A: Order ID and Phone last 4 input regex validation', () => {
  const validOrderId = 'AB-20261118-1A2B3C';
  const invalidOrderIds = [
    'AB-12345',
    'AB-20261118-123',
    'ab-20261118-1a2b3c', // lowercase
    'AB-20261118-1A2B3C/../../etc',
    '<script>',
  ];

  const orderIdRegex = /^AB-\d{8}-[0-9A-F]{6}$/;
  assert.equal(orderIdRegex.test(validOrderId), true);
  for (const id of invalidOrderIds) {
    assert.equal(orderIdRegex.test(id), false);
  }

  const phoneLast4Regex = /^\d{4}$/;
  assert.equal(phoneLast4Regex.test('4567'), true);
  assert.equal(phoneLast4Regex.test('0000'), true);
  assert.equal(phoneLast4Regex.test('123'), false);
  assert.equal(phoneLast4Regex.test('12345'), false);
  assert.equal(phoneLast4Regex.test('12a4'), false);
});
