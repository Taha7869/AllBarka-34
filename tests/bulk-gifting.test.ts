import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateBulkRecipient,
  parseBulkRecipientsCsv,
  generateSampleBulkCsv,
  calculateBulkTotals,
  MAX_BULK_RECIPIENTS,
  CORPORATE_QUOTE_THRESHOLD,
  type BulkRecipient,
} from '../src/lib/bulkGifting';
import type { PricingSummary } from '../src/lib/pricing';

test('Bulk Gifting - validateBulkRecipient validates required fields and formats', () => {
  // Valid row
  const valid = validateBulkRecipient(
    {
      name: 'Zainab Khan',
      phone: '0300 1234567',
      address: 'House 14, Street 2, DHA Phase 6',
      city: 'Lahore',
      giftMessage: 'Warmest regards and best wishes!',
    },
    0
  );
  assert.equal(valid.recipientName, 'Zainab Khan');
  assert.equal(valid.city, 'Lahore');
  assert.equal(valid.giftMessage, 'Warmest regards and best wishes!');

  // Missing name throws error
  assert.throws(
    () =>
      validateBulkRecipient(
        {
          name: '',
          phone: '03001234567',
          address: 'House 14, Street 2, DHA',
          city: 'Lahore',
        },
        1
      ),
    /Recipient name is required/
  );

  // Invalid phone throws error
  assert.throws(
    () =>
      validateBulkRecipient(
        {
          name: 'Ali Ahmed',
          phone: '123',
          address: 'House 14, Street 2, DHA',
          city: 'Lahore',
        },
        2
      ),
    /Valid phone number required/
  );

  // Short address throws error
  assert.throws(
    () =>
      validateBulkRecipient(
        {
          name: 'Ali Ahmed',
          phone: '03001234567',
          address: 'DHA',
          city: 'Lahore',
        },
        3
      ),
    /Delivery address must be at least 5 characters/
  );
});

test('Bulk Gifting - parseBulkRecipientsCsv parses CSV correctly and handles quotes', () => {
  const sampleCsv = generateSampleBulkCsv();
  const result = parseBulkRecipientsCsv(sampleCsv);

  assert.equal(result.errors.length, 0);
  assert.equal(result.exceedsMax, false);
  assert.equal(result.recipients.length, 3);

  // First recipient verification
  assert.equal(result.recipients[0].recipientName, 'Zainab Khan');
  assert.equal(result.recipients[0].address, 'House 12, Street 4, DHA Phase 5');
  assert.equal(result.recipients[0].city, 'Lahore');
  assert.equal(result.recipients[0].giftMessage, 'Wishing you joyous celebrations!');

  // Second recipient in Karachi
  assert.equal(result.recipients[1].recipientName, 'Ali Ahmed');
  assert.equal(result.recipients[1].city, 'Karachi');

  // Third recipient in Islamabad
  assert.equal(result.recipients[2].recipientName, 'Fatima Tariq');
  assert.equal(result.recipients[2].city, 'Islamabad');
});

test('Bulk Gifting - parseBulkRecipientsCsv enforces 50 max recipient limit', () => {
  const header = 'Name,Phone,Address,City,Gift Message\n';
  let rows = '';
  for (let i = 1; i <= 60; i++) {
    rows += `Recipient ${i},03001234567,"House ${i}, Street 1, Model Town",Lahore,"Gift ${i}"\n`;
  }

  const result = parseBulkRecipientsCsv(header + rows);
  assert.equal(result.exceedsMax, true);
  assert.equal(result.recipients.length, MAX_BULK_RECIPIENTS);
  assert.equal(MAX_BULK_RECIPIENTS, 50);
});

test('Bulk Gifting - calculateBulkTotals computes per-recipient shipping and child shipments', () => {
  const singleSummary: PricingSummary = {
    subtotal: 5000,
    discount: 500,
    discountedSubtotal: 4500,
    shipping: 0,
    giftWrapFee: 0,
    total: 4500,
    shippingWeightGrams: 1000,
    shippingRegion: 'lahore',
  };

  const recipients: BulkRecipient[] = [
    {
      id: 'r1',
      recipientName: 'Lahore Patron',
      phone: '03001234567',
      address: 'Gulberg 3, Main Blvd',
      city: 'Lahore',
      giftMessage: 'Eid Mubarak',
    },
    {
      id: 'r2',
      recipientName: 'Karachi Patron',
      phone: '03217654321',
      address: 'Clifton Block 4',
      city: 'Karachi',
      giftMessage: 'Best wishes',
    },
  ];

  const { totals, shipments } = calculateBulkTotals({
    singleSummary,
    recipients,
    shippingMethodId: 'standard',
    orderId: 'AB-20261119-TEST',
  });

  // 2 recipients: subtotal is 2 * 5000 = 10000
  assert.equal(totals.subtotal, 10000);
  assert.equal(totals.discount, 1000);
  assert.equal(totals.discountedSubtotal, 9000);

  // Lahore recipient (discountedSubtotal 4500 >= 3000 free threshold) -> shipping 0
  // Karachi recipient (outside Lahore) -> nationwide shipping rate
  assert.equal(shipments.length, 2);
  assert.equal(shipments[0].shipmentId, 'AB-20261119-TEST-S01');
  assert.equal(shipments[0].shippingFee, 0); // Lahore free shipping
  assert.equal(shipments[1].shipmentId, 'AB-20261119-TEST-S02');
  assert.ok(shipments[1].shippingFee > 0); // Karachi shipping fee

  // Total shipping equals sum of child shipments
  assert.equal(totals.shipping, shipments[0].shippingFee + shipments[1].shippingFee);
  assert.equal(totals.total, totals.discountedSubtotal + totals.shipping);
});

test('Bulk Gifting - CORPORATE_QUOTE_THRESHOLD is 20', () => {
  assert.equal(CORPORATE_QUOTE_THRESHOLD, 20);
});
