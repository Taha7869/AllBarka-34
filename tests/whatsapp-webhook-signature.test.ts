import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import express from 'express';
import {
  verifyWhatsAppWebhookSignature,
  requireWhatsAppWebhookSignature,
  createWhatsAppWebhookRouter,
} from '../src/lib/whatsappWebhook';

const TEST_SECRET = 'allbarka-meta-test-secret-32-chars-long';
const TEST_VERIFY_TOKEN = 'allbarka-verify-token-xyz';

function generateSignature(payload: string, secret: string = TEST_SECRET): string {
  const hmac = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  return `sha256=${hmac}`;
}

test('verifyWhatsAppWebhookSignature: returns true for valid HMAC SHA-256 signature', () => {
  const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
  const signature = generateSignature(payload, TEST_SECRET);

  const isValid = verifyWhatsAppWebhookSignature(payload, signature, TEST_SECRET);
  assert.equal(isValid, true);
});

test('verifyWhatsAppWebhookSignature: returns false when payload is tampered', () => {
  const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
  const signature = generateSignature(payload, TEST_SECRET);
  const tamperedPayload = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'injected' }] });

  const isValid = verifyWhatsAppWebhookSignature(tamperedPayload, signature, TEST_SECRET);
  assert.equal(isValid, false);
});

test('verifyWhatsAppWebhookSignature: returns false when secret does not match', () => {
  const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
  const signature = generateSignature(payload, 'wrong-secret-key-1234567890');

  const isValid = verifyWhatsAppWebhookSignature(payload, signature, TEST_SECRET);
  assert.equal(isValid, false);
});

test('verifyWhatsAppWebhookSignature: rejects missing, empty, or malformed signatures', () => {
  const payload = '{"test":true}';
  assert.equal(verifyWhatsAppWebhookSignature(payload, undefined, TEST_SECRET), false);
  assert.equal(verifyWhatsAppWebhookSignature(payload, '', TEST_SECRET), false);
  assert.equal(verifyWhatsAppWebhookSignature(payload, 'invalid-prefix', TEST_SECRET), false);
  assert.equal(verifyWhatsAppWebhookSignature(payload, 'sha256=', TEST_SECRET), false);
  assert.equal(verifyWhatsAppWebhookSignature(payload, 'sha256=12345', TEST_SECRET), false); // too short
  assert.equal(verifyWhatsAppWebhookSignature(payload, `sha256=${'z'.repeat(64)}`, TEST_SECRET), false); // non-hex
  assert.equal(verifyWhatsAppWebhookSignature(payload, generateSignature(payload), ''), false); // missing secret
});

test('HTTP Router: GET /api/webhooks/whatsapp verification handshake', async () => {
  const app = express();
  app.use(createWhatsAppWebhookRouter({
    getVerifyToken: () => TEST_VERIFY_TOKEN,
    getAppSecret: () => TEST_SECRET,
  }));

  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    // 1. Valid handshake
    const validRes = await fetch(`http://127.0.0.1:${port}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${TEST_VERIFY_TOKEN}&hub.challenge=test_challenge_123`);
    assert.equal(validRes.status, 200);
    const validBody = await validRes.text();
    assert.equal(validBody, 'test_challenge_123');

    // 2. Invalid verify token
    const invalidRes = await fetch(`http://127.0.0.1:${port}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test_challenge_123`);
    assert.equal(invalidRes.status, 403);
  } finally {
    server.close();
  }
});

test('HTTP Router: POST /api/webhooks/whatsapp rejects missing or wrong signature with 401', async () => {
  const app = express();
  app.use(express.json());
  app.use(createWhatsAppWebhookRouter({
    getAppSecret: () => TEST_SECRET,
  }));

  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    const payload = { object: 'whatsapp_business_account', entry: [] };

    // 1. Missing header -> 401
    const missingRes = await fetch(`http://127.0.0.1:${port}/api/webhooks/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.equal(missingRes.status, 401);
    const missingData = await missingRes.json() as any;
    assert.equal(missingData.code, 'INVALID_SIGNATURE');

    // 2. Wrong signature -> 401
    const wrongRes = await fetch(`http://127.0.0.1:${port}/api/webhooks/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': `sha256=${'0'.repeat(64)}`,
      },
      body: JSON.stringify(payload),
    });
    assert.equal(wrongRes.status, 401);
    const wrongData = await wrongRes.json() as any;
    assert.equal(wrongData.code, 'INVALID_SIGNATURE');

    // 3. Valid signature -> 200
    const validSig = generateSignature(JSON.stringify(payload), TEST_SECRET);
    const validRes = await fetch(`http://127.0.0.1:${port}/api/webhooks/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': validSig,
      },
      body: JSON.stringify(payload),
    });
    assert.equal(validRes.status, 200);
    const validData = await validRes.json() as any;
    assert.equal(validData.ok, true);
    assert.equal(validData.status, 'RECEIVED');
  } finally {
    server.close();
  }
});
