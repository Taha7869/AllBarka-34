import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { once } from 'node:events';
import { createInquiriesRouter } from '../src/lib/inquiriesRouter';
import { computeInquiryPayloadHash } from '../src/lib/inquiryService';
import { memoryFirestore } from './helpers/memoryFirestore';

const input = {
  customerName: 'Fixture Customer', phone: '03001234567', city: 'Lahore',
  productId: '', boxMode: 'filled', quantity: 1, eventType: 'Other Celebration',
  customPrintText: 'Print only this message',
};

test('recipient intent preserves legacy hashes and is distinct from printing instructions', () => {
  const original = computeInquiryPayloadHash(input);
  assert.equal(computeInquiryPayloadHash({ ...input, giftRecipient: undefined }), original);
  assert.notEqual(computeInquiryPayloadHash({ ...input, giftRecipient: 'family' }), original);
  assert.notEqual(computeInquiryPayloadHash({ ...input, giftRecipient: 'family' }), computeInquiryPayloadHash({ ...input, giftRecipient: 'clients' }));
});

for (const endpoint of ['/api/inquiries', '/api/quotes']) {
  test(`${endpoint}: validates, persists and replays recipient intent without changing prices or printing`, async () => {
    const { db, records } = memoryFirestore();
    const app = express(); app.use(express.json());
    app.use(createInquiriesRouter({ getDb: () => db, getCatalog: () => [], requireAdmin: (_req, res) => { res.sendStatus(403); } }));
    const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    const origin = `http://127.0.0.1:${(server.address() as any).port}`;
    const send = (body: unknown, key: string) => fetch(origin + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body) });
    try {
      for (const invalid of ['unknown', 'FAMILY', { family: true }, ['family'], 1]) {
        const res = await send({ ...input, giftRecipient: invalid }, 'invalid-recipient');
        assert.equal(res.status, 400);
        assert.equal((await res.json()).code, 'INVALID_GIFT_RECIPIENT');
      }
      assert.equal(records.size, 0, 'invalid requests perform zero writes');
      const response = await send({ ...input, giftRecipient: 'family' }, 'recipient-case');
      assert.equal(response.status, 200);
      const data = await response.json();
      const stored: any = records.get(`inquiries/${data.id}`);
      assert.equal(stored.giftRecipient, 'family');
      assert.equal(stored.productId, endpoint === '/api/quotes' ? 'custom' : '', 'no unrelated catalog product is selected');
      assert.equal(stored.customPrintText, input.customPrintText);
      assert.equal(stored.standardPrice, null);
      assert.equal(stored.status, 'NEW');
      for (const url of [stored.whatsappUrl, stored.whatsappReplyUrl]) {
        const text = new URL(url).searchParams.get('text')!;
        assert.match(text, /Gift for:\* Family/);
        assert.match(text, /Design & Printing Notes:\* Print only this message/);
      }
      const retry = await send({ ...input, giftRecipient: 'family' }, 'recipient-case');
      assert.equal(retry.status, 200); assert.equal((await retry.json()).id, data.id);
      const conflict = await send({ ...input, giftRecipient: 'clients' }, 'recipient-case');
      assert.equal(conflict.status, 409);
      assert.equal((await conflict.json()).code, 'IDEMPOTENCY_PAYLOAD_MISMATCH');
      assert.equal([...records.keys()].filter(key => key.startsWith('inquiries/')).length, 1);
      assert.equal((await fetch(origin + '/api/admin/inquiries')).status, 403);
      const legacy = await send(input, 'legacy-no-recipient'); assert.equal(legacy.status, 200);
      assert.equal((await legacy.json()).inquiry.giftRecipient, undefined);
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  });
}
