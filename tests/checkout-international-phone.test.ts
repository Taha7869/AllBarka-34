import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeContactPhone,
  normalizePakistaniMobile,
  resolveCheckoutPhones,
  needsPakistaniDeliveryPhone,
  orderDeliveryPhone,
} from '../src/lib/phoneRules';
import { validateCustomerDetails, ValidationError } from '../src/lib/orderValidation';
import { validateBulkRecipient } from '../src/lib/bulkGifting';
import { generateAuthoritativeWhatsAppMessage, type CanonicalOrder } from '../src/lib/serverOrderService';
import { sanitizeOrderForAdmin, filterAdminOrders } from '../src/lib/adminOperations';
import { sanitizeOrderForStaff } from '../src/lib/staffAccess';
import { projectCanonicalOrderForN8n } from '../src/services/n8nOrderNotification';

test('normalizeContactPhone: accepts Pakistani mobiles and international E.164 numbers (8-15 digits)', () => {
  // Pakistani numbers
  assert.deepEqual(normalizeContactPhone('03001234567'), { valid: true, normalized: '03001234567', isPakistani: true });
  assert.deepEqual(normalizeContactPhone('+92 316 0666083'), { valid: true, normalized: '03160666083', isPakistani: true });
  assert.deepEqual(normalizeContactPhone('0092-300-1234567'), { valid: true, normalized: '03001234567', isPakistani: true });

  // International numbers (UK, US, UAE, Saudi, Canada)
  assert.deepEqual(normalizeContactPhone('+44 7911 123456'), { valid: true, normalized: '+447911123456', isPakistani: false });
  assert.deepEqual(normalizeContactPhone('+1 (415) 555-2671'), { valid: true, normalized: '+14155552671', isPakistani: false });
  assert.deepEqual(normalizeContactPhone('+971-50-123-4567'), { valid: true, normalized: '+971501234567', isPakistani: false });
  assert.deepEqual(normalizeContactPhone('00966501234567'), { valid: true, normalized: '+966501234567', isPakistani: false });

  // Rejects missing country code on non-Pakistani numbers, landlines, too short (<8 digits), or too long (>15 digits)
  assert.equal(normalizeContactPhone('').valid, false);
  assert.equal(normalizeContactPhone('7911123456').valid, false);
  assert.equal(normalizeContactPhone('+4412345').valid, false); // 7 digits -> too short
  assert.equal(normalizeContactPhone('+1234567890123456').valid, false); // 16 digits -> too long
  assert.equal(normalizeContactPhone('+924235889900').valid, false); // Pakistani landline
  assert.equal(normalizeContactPhone('04235889900').valid, false);
});

test('resolveCheckoutPhones & validateCustomerDetails: foreign contact phone requires Pakistani deliveryPhone', () => {
  const base = {
    name: 'Ayesha Khan',
    address: 'House 24, Street 8, Sector F-7/3',
    city: 'Islamabad',
    paymentMethod: 'bank',
  };

  // 1. Foreign contact phone WITHOUT deliveryPhone -> DELIVERY_PHONE_REQUIRED
  assert.equal(needsPakistaniDeliveryPhone('+447911123456'), true);
  assert.equal(needsPakistaniDeliveryPhone('03001234567'), false);

  const missingDelivery = resolveCheckoutPhones('+447911123456', '');
  assert.deepEqual(missingDelivery, { ok: false, error: 'DELIVERY_PHONE_REQUIRED', field: 'deliveryPhone' });

  assert.throws(
    () => validateCustomerDetails({ ...base, phone: '+447911123456' }),
    (err: any) => err instanceof ValidationError && err.code === 'DELIVERY_PHONE_REQUIRED'
  );

  // 2. Foreign contact phone WITH non-Pakistani deliveryPhone -> INVALID_DELIVERY_PHONE
  assert.throws(
    () => validateCustomerDetails({ ...base, phone: '+447911123456', deliveryPhone: '+447911654321' }),
    (err: any) => err instanceof ValidationError && err.code === 'INVALID_DELIVERY_PHONE'
  );

  // 3. Foreign contact phone WITH valid Pakistani deliveryPhone -> succeeds!
  const validated = validateCustomerDetails({
    ...base,
    phone: '+44 7911 123456',
    deliveryPhone: '+92 300 9876543',
  });
  assert.equal(validated.phone, '+447911123456');
  assert.equal(validated.deliveryPhone, '03009876543');

  // 4. Pakistani contact phone works without separate deliveryPhone
  const pkCustomer = validateCustomerDetails({
    ...base,
    phone: '03160666083',
  });
  assert.equal(pkCustomer.phone, '03160666083');
  assert.equal(pkCustomer.deliveryPhone, '03160666083');
});

test('Bulk gifting: every recipient phone must still be a Pakistani mobile number', () => {
  assert.throws(
    () => validateBulkRecipient({
      recipientName: 'Overseas Friend',
      phone: '+447911123456',
      address: 'House 10, Block B, Gulberg III',
      city: 'Lahore',
    }, 0),
    (err: any) => err instanceof ValidationError && err.code === 'INVALID_PHONE'
  );

  const validRecipient = validateBulkRecipient({
    recipientName: 'Lahore Recipient',
    phone: '+92 321 7654321',
    address: 'House 10, Block B, Gulberg III',
    city: 'Lahore',
  }, 0);
  assert.equal(validRecipient.phone, '03217654321');
});

test('Order views, WhatsApp message, and n8n projection surface deliveryPhone distinctly', () => {
  const sampleOrder: CanonicalOrder = {
    schemaVersion: '2.0.0',
    orderId: 'AB-20261118-A1B2C3',
    source: 'website',
    createdAt: '2026-11-18T10:00:00.000Z',
    createdAtMs: Date.parse('2026-11-18T10:00:00.000Z'),
    updatedAt: '2026-11-18T10:00:00.000Z',
    updatedAtMs: Date.parse('2026-11-18T10:00:00.000Z'),
    status: 'ORDER_RECEIVED',
    paymentStatus: 'UNPAID',
    paymentMethod: 'bank',
    uid: 'user-diaspora-1',
    customer: {
      name: 'Zainab Overseas',
      phone: '+447911123456',
      deliveryPhone: '03009876543',
      address: 'House 12, Street 5, DHA Phase 5',
      city: 'Lahore',
      deliverySlot: 'Fastest Dispatch',
    },
    gifting: { giftWrapping: false, giftWrapFee: 0 },
    items: [
      { id: 'pista-500g', productId: 'pista', name: 'Roasted Iranian Pistachios', selectedWeight: '500g', quantity: 1, price: 2500, earnedPoints: 25 },
    ],
    totals: { subtotal: 2500, discount: 0, discountedSubtotal: 2500, shipping: 150, giftWrapFee: 0, total: 2650 },
    earnedPoints: 25,
  };

  assert.equal(orderDeliveryPhone(sampleOrder.customer), '03009876543');

  // WhatsApp message contains both Contact and Delivery Phone (Pakistan)
  const waMsg = generateAuthoritativeWhatsAppMessage(sampleOrder);
  assert.ok(waMsg.includes('Contact: +447911123456'));
  assert.ok(waMsg.includes('Delivery Phone (Pakistan): 03009876543'));

  // Admin & Staff projections preserve deliveryPhone and allow searching by either phone
  const adminOrder = sanitizeOrderForAdmin(sampleOrder);
  assert.equal(adminOrder.customer.phone, '+447911123456');
  assert.equal(adminOrder.customer.deliveryPhone, '03009876543');

  const staffOrder = sanitizeOrderForStaff(sampleOrder);
  assert.equal(staffOrder.customer.phone, '+447911123456');
  assert.equal(staffOrder.customer.deliveryPhone, '03009876543');

  const foundByUk = filterAdminOrders([sampleOrder], { queue: 'all', status: 'ALL', paymentStatus: 'ALL', paymentMethod: 'ALL', range: 'all', search: '7911123456', page: 1, limit: 20 });
  assert.equal(foundByUk.length, 1);

  const foundByPk = filterAdminOrders([sampleOrder], { queue: 'all', status: 'ALL', paymentStatus: 'ALL', paymentMethod: 'ALL', range: 'all', search: '03009876543', page: 1, limit: 20 });
  assert.equal(foundByPk.length, 1);

  // n8n projection uses Pakistani deliveryPhone for courier `phone` and passes `contactPhone`
  const n8nOrder = projectCanonicalOrderForN8n(sampleOrder);
  assert.equal(n8nOrder.customer.phone, '03009876543');
  assert.equal(n8nOrder.customer.contactPhone, '+447911123456');
});
