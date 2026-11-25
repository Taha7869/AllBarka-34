import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import express from 'express';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { sanitizePaymentDetails, type PublicPaymentDetails } from '../src/lib/paymentDetails';
import {
  createPaymentDetailsRouter,
  PAYMENT_DETAILS_CACHE_MS,
  resetPaymentDetailsCache,
} from '../src/lib/paymentDetailsRouter';
import { sanitizeOrderForTracking } from '../src/lib/orderTrackingService';
import BankTransferDetailsCard from '../src/components/BankTransferDetailsCard';
import { LanguageProvider } from '../src/contexts/LanguageContext';

const FAKE_FIRESTORE_PAYMENT_DOC = {
  bankName: '  Example Heritage Bank  ',
  accountTitle: '  AllBarka Fixture Account  ',
  accountNumber: ' 0000-1111222233 ',
  iban: ' PK00EXMP0000000000111122 ',
  raastId: '   ',
  wallets: [
    { label: 'Easypaisa ', number: ' 0300-0000001 ' },
    { label: ' JazzCash', number: '0300-0000002 ' },
    { label: 'Incomplete Wallet', number: '   ' },
  ],
  version: 2,
  updatedAt: '2026-11-25T00:00:00.000Z',
  internalAdminSecret: 'DO_NOT_EXPOSE',
};

function createFakeFirestore(docData: Record<string, unknown> | null) {
  let reads = 0;
  const db = {
    collection(colName: string) {
      return {
        doc(docId: string) {
          return {
            async get() {
              reads += 1;
              if (colName === 'content' && docId === 'paymentDetails' && docData) {
                return { exists: true, data: () => structuredClone(docData) };
              }
              return { exists: false, data: () => undefined };
            },
          };
        },
      };
    },
  };
  return { db: db as any, getReads: () => reads };
}

test('sanitizePaymentDetails trims strings, drops blank raastId & bad wallets, and strips unknown fields', () => {
  const sanitized = sanitizePaymentDetails(FAKE_FIRESTORE_PAYMENT_DOC);
  assert.ok(sanitized);
  assert.equal(sanitized.bankName, 'Example Heritage Bank');
  assert.equal(sanitized.accountTitle, 'AllBarka Fixture Account');
  assert.equal(sanitized.accountNumber, '0000-1111222233');
  assert.equal(sanitized.iban, 'PK00EXMP0000000000111122');
  assert.equal(sanitized.raastId, undefined, 'Blank raastId must be omitted');
  assert.deepEqual(sanitized.wallets, [
    { label: 'Easypaisa', number: '0300-0000001' },
    { label: 'JazzCash', number: '0300-0000002' },
  ]);
  assert.equal(sanitized.version, 2);
  assert.equal((sanitized as any).internalAdminSecret, undefined);

  // Preserves non-empty raastId when provided
  const withRaast = sanitizePaymentDetails({ ...FAKE_FIRESTORE_PAYMENT_DOC, raastId: ' 0300-0000009 ' });
  assert.equal(withRaast?.raastId, '0300-0000009');

  // Empty doc returns null so UI falls back to concierge text
  assert.equal(sanitizePaymentDetails({ bankName: 'Example Bank', raastId: '', wallets: [] }), null);
});

test('GET /api/payment-details serves sanitized JSON with 5-minute cache and graceful fallback', async () => {
  assert.equal(PAYMENT_DETAILS_CACHE_MS, 5 * 60_000);
  resetPaymentDetailsCache();

  const fake = createFakeFirestore(FAKE_FIRESTORE_PAYMENT_DOC);
  const app = express();
  app.use(createPaymentDetailsRouter({ getDb: () => fake.db }));

  const server = app.listen(0);
  const { port } = server.address() as { port: number };
  const base = `http://127.0.0.1:${port}`;

  try {
    const res1 = await fetch(`${base}/api/payment-details`);
    assert.equal(res1.status, 200);
    assert.equal(res1.headers.get('cache-control'), 'no-store');
    const json1 = await res1.json();
    assert.equal(json1.available, true);
    assert.equal(json1.details.wallets[0].label, 'Easypaisa');
    assert.equal(json1.details.raastId, undefined);
    assert.equal(JSON.stringify(json1).includes('DO_NOT_EXPOSE'), false);
    assert.equal(fake.getReads(), 1);

    // Second request within 5 min hits cache (still 1 Firestore read)
    const res2 = await fetch(`${base}/api/payment-details`);
    assert.equal(res2.status, 200);
    assert.equal(fake.getReads(), 1);

    // Resetting cache triggers a fresh read
    resetPaymentDetailsCache();
    const res3 = await fetch(`${base}/api/payment-details`);
    assert.equal(res3.status, 200);
    assert.equal(fake.getReads(), 2);
  } finally {
    server.close();
    resetPaymentDetailsCache();
  }

  // Unconfigured DB returns 503 with available: false
  const unavailableApp = express();
  unavailableApp.use(createPaymentDetailsRouter({ getDb: () => null }));
  const unavailableServer = unavailableApp.listen(0);
  const uPort = (unavailableServer.address() as { port: number }).port;
  try {
    const res = await fetch(`http://127.0.0.1:${uPort}/api/payment-details`);
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.available, false);
    assert.equal(body.details, null);
  } finally {
    unavailableServer.close();
  }
});

test('sanitizeOrderForTracking marks BANK orders with isBankTransfer without exposing PII', () => {
  const bankOrder = sanitizeOrderForTracking(
    {
      orderId: 'AB-20261125-AA11BB',
      status: 'ORDER_RECEIVED',
      paymentMethod: 'bank',
      customer: { name: 'Private User', phone: '03000000000' },
      totalAmount: 4500,
    },
    'AB-20261125-AA11BB',
  );
  assert.equal(bankOrder.isBankTransfer, true);
  assert.equal((bankOrder as any).customer, undefined);
  assert.equal((bankOrder as any).totalAmount, undefined);
  assert.equal((bankOrder as any).paymentMethod, undefined);

  const codOrder = sanitizeOrderForTracking(
    { orderId: 'AB-20261125-CC22DD', status: 'ORDER_RECEIVED', paymentMethod: 'cod' },
    'AB-20261125-CC22DD',
  );
  assert.equal(codOrder.isBankTransfer, undefined);
});

test('BankTransferDetailsCard renders trimmed values, copy buttons, order reference, omits blank raastId, and falls back gracefully', () => {
  const fixtureDetails: PublicPaymentDetails = sanitizePaymentDetails(FAKE_FIRESTORE_PAYMENT_DOC)!;

  const populatedHtml = renderToStaticMarkup(
    <LanguageProvider>
      <BankTransferDetailsCard orderId="AB-20261125-AA11BB" initialDetails={fixtureDetails} />
    </LanguageProvider>,
  );
  assert.match(populatedHtml, /Example Heritage Bank/);
  assert.match(populatedHtml, /AllBarka Fixture Account/);
  assert.match(populatedHtml, /0000-1111222233/);
  assert.match(populatedHtml, /PK00EXMP0000000000111122/);
  assert.match(populatedHtml, /Easypaisa/);
  assert.match(populatedHtml, /0300-0000001/);
  assert.doesNotMatch(populatedHtml, /Raast ID/, 'Empty raastId row must not render');
  assert.match(populatedHtml, /aria-label="Copy Account number"/);
  assert.match(populatedHtml, /aria-label="Copy IBAN"/);
  assert.match(populatedHtml, /aria-label="Copy Easypaisa"/);
  assert.match(populatedHtml, /aria-label="Copy Order ID"/);
  assert.match(populatedHtml, /Write your Order ID in the payment reference:/);
  assert.match(populatedHtml, /AB-20261125-AA11BB/);
  assert.match(populatedHtml, /share the receipt with our concierge on WhatsApp/i);

  // Fallback when details fail to load (null)
  const fallbackHtml = renderToStaticMarkup(
    <LanguageProvider>
      <BankTransferDetailsCard orderId="AB-20261125-AA11BB" initialDetails={null} />
    </LanguageProvider>,
  );
  assert.match(fallbackHtml, /data-testid="bank-transfer-fallback"/);
  assert.match(fallbackHtml, /Confirm the bank \/ Raast account with AllBarka concierge/i);
  assert.match(fallbackHtml, /share the receipt with our concierge on WhatsApp/i);
});

test('CheckoutPage fixes dark-mode contrast and hides pre-order quote banner and checkoutIntro on success', () => {
  const checkoutSrc = readFileSync('src/pages/CheckoutPage.tsx', 'utf8');
  assert.doesNotMatch(
    checkoutSrc,
    /bg-\[#042821\]\s+text-\[var\(--color-surface/,
    'Dark emerald cards/buttons must not use var(--color-surface) as text color (turns dark in dark mode)',
  );
  assert.doesNotMatch(
    checkoutSrc,
    /text-\[var\(--color-emerald,#042821\)\]/,
    'Success Total payable must not use dark emerald text token without a high-contrast dark mode color',
  );
  assert.match(
    checkoutSrc,
    /currentStep !== 'success' && \(\s*<div data-testid="checkout-quote-banner"/,
    'Quote status banner must hide once order is placed',
  );
  // Ensure purchase.checkoutIntro only appears behind currentStep !== 'success'
  const introMatches = checkoutSrc.match(/purchase\.checkoutIntro/g) || [];
  assert.equal(introMatches.length, 1, 'purchase.checkoutIntro must not appear inside Step 4 success');
});
