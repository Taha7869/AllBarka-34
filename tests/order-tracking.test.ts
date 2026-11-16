import assert from 'node:assert/strict';
import test from 'node:test';
import {
  verifyPhoneLast4,
  buildStatusTimeline,
  sanitizeOrderForTracking,
  TRACKING_STEPS,
} from '../src/lib/orderTrackingService';
import { ORDER_STATUSES } from '../src/lib/orderStatuses';

test('Feature C: Phone Last 4 Digits Verification', () => {
  // 1. Standard mobile format (03001234567)
  assert.equal(verifyPhoneLast4('03001234567', '4567'), true);

  // 2. Formatted international (+92 300 123-4567)
  assert.equal(verifyPhoneLast4('+92 300 123-4567', '4567'), true);

  // 3. Hyphenated format (0300-1234567)
  assert.equal(verifyPhoneLast4('0300-1234567', '4567'), true);

  // 4. Incorrect last 4 digits
  assert.equal(verifyPhoneLast4('03001234567', '9999'), false);

  // 5. Invalid target lengths (< 4 or > 4)
  assert.equal(verifyPhoneLast4('03001234567', '567'), false);
  assert.equal(verifyPhoneLast4('03001234567', '12345'), false);

  // 6. Non-digit characters in target
  assert.equal(verifyPhoneLast4('03001234567', '456a'), false);

  // 7. Empty or missing values
  assert.equal(verifyPhoneLast4(null, '4567'), false);
  assert.equal(verifyPhoneLast4('', '4567'), false);
});

test('Feature C: Status Timeline Generation follows ORDER_STATUSES sequence', () => {
  // 1. Verify tracking steps derive strictly from canonical ORDER_STATUSES
  for (const step of TRACKING_STEPS) {
    assert.ok(ORDER_STATUSES.includes(step), `Step ${step} must be in ORDER_STATUSES`);
  }

  // 2. Active status: PREPARING
  const preparingState = buildStatusTimeline('PREPARING');
  assert.equal(preparingState.isCancelled, false);
  const steps = preparingState.timeline;
  assert.equal(steps.length, 6);

  // Steps before PREPARING must be completed
  assert.equal(steps[0].status, 'ORDER_RECEIVED');
  assert.equal(steps[0].completed, true);
  assert.equal(steps[0].current, false);

  assert.equal(steps[1].status, 'CONFIRMED');
  assert.equal(steps[1].completed, true);
  assert.equal(steps[1].current, false);

  // PREPARING is active / current
  assert.equal(steps[2].status, 'PREPARING');
  assert.equal(steps[2].completed, false);
  assert.equal(steps[2].current, true);

  // Steps after PREPARING are upcoming
  assert.equal(steps[3].status, 'DISPATCHED');
  assert.equal(steps[3].completed, false);
  assert.equal(steps[3].current, false);

  // 3. Completed state: DELIVERED
  const deliveredState = buildStatusTimeline('DELIVERED');
  assert.equal(deliveredState.isCancelled, false);
  const deliveredSteps = deliveredState.timeline;
  for (let i = 0; i < 5; i++) {
    assert.equal(deliveredSteps[i].completed, true);
  }
  assert.equal(deliveredSteps[5].status, 'DELIVERED');
  assert.equal(deliveredSteps[5].current, true);

  // 4. Cancelled status
  const cancelledState = buildStatusTimeline('CANCELLED');
  assert.equal(cancelledState.isCancelled, true);
});

test('Feature C: Privacy Boundary Enforcement (Zero Personal Info Leaked)', () => {
  // Mock rich order containing sensitive patron information
  const mockSensitiveOrder = {
    orderId: 'AB-98765',
    status: 'DISPATCHED',
    createdAt: '2026-11-17T02:00:00Z',
    updatedAt: '2026-11-17T03:30:00Z',
    customer: {
      name: 'Muhammad Tariq',
      email: 'tariq@example.com',
      phone: '03001234567',
    },
    shippingAddress: {
      street: 'House 42, Street 5, Gulberg III',
      city: 'Lahore',
      postalCode: '54000',
    },
    items: [
      { id: 'pista-500g', name: 'Roasted Pistachios', price: 2500, quantity: 2 },
      { id: 'ajwa-dates-1kg', name: 'Ajwa Dates', price: 6800, quantity: 1 },
    ],
    total: 11800,
    paymentMethod: 'cod',
    internalNotes: 'VIP patron — fragile gift box',
  };

  const sanitized = sanitizeOrderForTracking(mockSensitiveOrder, 'AB-98765');

  // Allowed public tracking fields
  assert.equal(sanitized.success, true);
  assert.equal(sanitized.orderId, 'AB-98765');
  assert.equal(sanitized.status, 'DISPATCHED');
  assert.equal(sanitized.createdAt, '2026-11-17T02:00:00Z');
  assert.equal(sanitized.city, 'Lahore');
  assert.ok(Array.isArray(sanitized.timeline));

  // STRICT PRIVACY CHECKS: Zero personal or financial data
  assert.equal((sanitized as any).customer, undefined);
  assert.equal((sanitized as any).name, undefined);
  assert.equal((sanitized as any).email, undefined);
  assert.equal((sanitized as any).phone, undefined);
  assert.equal((sanitized as any).items, undefined);
  assert.equal((sanitized as any).total, undefined);
  assert.equal((sanitized as any).street, undefined);
  assert.equal((sanitized as any).paymentMethod, undefined);
  assert.equal((sanitized as any).internalNotes, undefined);
});
