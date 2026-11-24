import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import express from 'express';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createReviewsRouter } from '../src/lib/reviewsRouter';
import { sanitizeReviewImageBuffer } from '../src/lib/reviewImageSanitizer';
import { sanitizeAreaLocation, sanitizePublishedReviews } from '../src/lib/publishedReviews';
import { resetPublishedReviewsCache } from '../src/lib/storefrontContentRouter';
import PatronVoicesSection from '../src/components/PatronVoicesSection';
import OrderReviewForm from '../src/components/OrderReviewForm';
import { LanguageProvider } from '../src/contexts/LanguageContext';

// ── Synthetic minimal valid binary images with injected EXIF/GPS metadata ─────
function makeWebpWithExif(width: number, height: number, exifSecret: string): Buffer {
  // VP8X chunk (10 bytes payload): flag byte 0x2c (ICCP 0x20 | EXIF 0x08 | XMP 0x04)
  const vp8xPayload = Buffer.alloc(10);
  vp8xPayload[0] = 0x2c;
  const wMinus1 = width - 1;
  const hMinus1 = height - 1;
  vp8xPayload[4] = wMinus1 & 0xff;
  vp8xPayload[5] = (wMinus1 >> 8) & 0xff;
  vp8xPayload[6] = (wMinus1 >> 16) & 0xff;
  vp8xPayload[7] = hMinus1 & 0xff;
  vp8xPayload[8] = (hMinus1 >> 8) & 0xff;
  vp8xPayload[9] = (hMinus1 >> 16) & 0xff;

  const vp8xChunk = Buffer.concat([Buffer.from('VP8X'), Buffer.alloc(4), vp8xPayload]);
  vp8xChunk.writeUInt32LE(vp8xPayload.length, 4);

  // Minimal VP8L chunk
  const vp8lPayload = Buffer.alloc(6);
  vp8lPayload[0] = 0x2f;
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
  vp8lPayload.writeUInt32LE(bits >>> 0, 1);
  const vp8lChunk = Buffer.concat([Buffer.from('VP8L'), Buffer.alloc(4), vp8lPayload]);
  vp8lChunk.writeUInt32LE(vp8lPayload.length, 4);

  // EXIF chunk with secret GPS coordinates
  const exifRaw = Buffer.from(exifSecret, 'utf8');
  const exifPad = exifRaw.length % 2 ? Buffer.from([0]) : Buffer.alloc(0);
  const exifChunk = Buffer.concat([Buffer.from('EXIF'), Buffer.alloc(4), exifRaw, exifPad]);
  exifChunk.writeUInt32LE(exifRaw.length, 4);

  // XMP chunk
  const xmpRaw = Buffer.from('<x:xmpmeta>SECRET_XMP_LOC</x:xmpmeta>', 'utf8');
  const xmpPad = xmpRaw.length % 2 ? Buffer.from([0]) : Buffer.alloc(0);
  const xmpChunk = Buffer.concat([Buffer.from('XMP '), Buffer.alloc(4), xmpRaw, xmpPad]);
  xmpChunk.writeUInt32LE(xmpRaw.length, 4);

  const body = Buffer.concat([vp8xChunk, vp8lChunk, exifChunk, xmpChunk]);
  const riff = Buffer.alloc(12);
  riff.write('RIFF', 0, 'ascii');
  riff.writeUInt32LE(4 + body.length, 4);
  riff.write('WEBP', 8, 'ascii');
  return Buffer.concat([riff, body]);
}

function makeJpegWithExif(width: number, height: number, exifSecret: string): Buffer {
  const soi = Buffer.from([0xff, 0xd8]);
  // APP1 (EXIF)
  const exifData = Buffer.from(`Exif\0\0${exifSecret}`, 'utf8');
  const app1 = Buffer.alloc(4 + exifData.length);
  app1[0] = 0xff; app1[1] = 0xe1;
  app1.writeUInt16BE(exifData.length + 2, 2);
  exifData.copy(app1, 4);

  // COM comment
  const comData = Buffer.from('PRIVATE_CAMERA_COMMENT', 'utf8');
  const com = Buffer.alloc(4 + comData.length);
  com[0] = 0xff; com[1] = 0xfe;
  com.writeUInt16BE(comData.length + 2, 2);
  comData.copy(com, 4);

  // SOF0 with height/width
  const sof0 = Buffer.from([0xff, 0xc0, 0x00, 0x0b, 0x08, (height >> 8) & 0xff, height & 0xff, (width >> 8) & 0xff, width & 0xff, 0x01, 0x01, 0x11, 0x00]);
  // SOS + scan + EOI
  const sos = Buffer.from([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x12, 0x34, 0xff, 0xd9]);
  return Buffer.concat([soi, app1, com, sof0, sos]);
}

function makePngWithExif(width: number, height: number, textSecret: string): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const chunk = (type: string, data: Buffer) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 'ascii');
    data.copy(out, 8);
    return out;
  };
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('eXIf', Buffer.from(`GPS:${textSecret}`, 'utf8')),
    chunk('tEXt', Buffer.from(`Location\0${textSecret}`, 'utf8')),
    chunk('IDAT', Buffer.from([0x78, 0x9c, 0x63, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01])),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Minimal in-memory Firestore mock matching reviewsRouter & storefrontContentRouter ──
function createMockFirestore() {
  const store = new Map<string, Map<string, Record<string, any>>>();
  const ensure = (name: string) => {
    if (!store.has(name)) store.set(name, new Map());
    return store.get(name)!;
  };
  const makeSnap = (id: string, data?: Record<string, any>) => ({
    id,
    exists: Boolean(data),
    data: () => (data ? structuredClone(data) : undefined),
  });
  const makeQuery = (colName: string, filters: Array<{ field: string; val: any }> = [], maxLimit?: number) => ({
    where(field: string, _op: string, val: any) {
      return makeQuery(colName, [...filters, { field, val }], maxLimit);
    },
    limit(n: number) {
      return makeQuery(colName, filters, n);
    },
    async get() {
      const col = ensure(colName);
      let entries = Array.from(col.entries()).filter(([, doc]) =>
        filters.every((f) => doc[f.field] === f.val),
      );
      if (typeof maxLimit === 'number') entries = entries.slice(0, maxLimit);
      return { docs: entries.map(([id, doc]) => makeSnap(id, doc)) };
    },
  });

  const db = {
    collection(name: string) {
      const col = ensure(name);
      return {
        ...makeQuery(name),
        doc(id: string) {
          return {
            async get() {
              return makeSnap(id, col.get(id));
            },
            async set(data: Record<string, any>) {
              col.set(id, structuredClone(data));
            },
            async delete() {
              col.delete(id);
            },
          };
        },
      };
    },
  };
  return { db: db as any, store };
}

test('reviewImageSanitizer strips EXIF/GPS/XMP/comments from WebP, JPEG, PNG and enforces <= 1200px', () => {
  const secret = 'GPS_LAT_31.5204_LNG_74.3587_HOME_STREET';

  const webpIn = makeWebpWithExif(1200, 900, secret);
  assert.ok(webpIn.includes(Buffer.from(secret)), 'Fixture WebP contains secret EXIF before sanitization');
  const webpOut = sanitizeReviewImageBuffer(webpIn, 'image/webp');
  assert.equal(webpOut.mime, 'image/webp');
  assert.equal(webpOut.width, 1200);
  assert.equal(webpOut.height, 900);
  assert.equal(webpOut.buffer.includes(Buffer.from(secret)), false, 'EXIF GPS bytes stripped from WebP');
  assert.equal(webpOut.buffer.includes(Buffer.from('SECRET_XMP_LOC')), false, 'XMP stripped from WebP');
  assert.equal(webpOut.buffer.readUInt32LE(4), webpOut.buffer.length - 8, 'WebP RIFF length updated cleanly');

  const jpgIn = makeJpegWithExif(1000, 800, secret);
  assert.ok(jpgIn.includes(Buffer.from(secret)));
  const jpgOut = sanitizeReviewImageBuffer(jpgIn, 'image/jpeg');
  assert.equal(jpgOut.mime, 'image/jpeg');
  assert.equal(jpgOut.buffer.includes(Buffer.from(secret)), false, 'EXIF stripped from JPEG');
  assert.equal(jpgOut.buffer.includes(Buffer.from('PRIVATE_CAMERA_COMMENT')), false, 'COM stripped from JPEG');

  const pngIn = makePngWithExif(640, 480, secret);
  assert.ok(pngIn.includes(Buffer.from(secret)));
  const pngOut = sanitizeReviewImageBuffer(pngIn, 'image/png');
  assert.equal(pngOut.mime, 'image/png');
  assert.equal(pngOut.buffer.includes(Buffer.from(secret)), false, 'eXIf & tEXt stripped from PNG');

  // Dimension cap > 1200 rejected
  assert.throws(
    () => sanitizeReviewImageBuffer(makeWebpWithExif(1400, 900, 'x'), 'image/webp'),
    /REVIEW_IMAGE_DIMENSIONS_TOO_LARGE/,
  );

  // SVG/HTML disguised as WebP rejected
  assert.throws(
    () => sanitizeReviewImageBuffer(Buffer.from('<svg><script>alert(1)</script></svg>'), 'image/webp'),
    /INVALID_REVIEW_IMAGE_TYPE/,
  );
});

test('sanitizePublishedReviews & sanitizeAreaLocation strip street addresses, orderId, and PII', () => {
  assert.equal(
    sanitizeAreaLocation('House 14, Street 7, DHA Phase 6, Lahore'),
    'DHA Phase 6, Lahore',
  );

  const projected = sanitizePublishedReviews([
    {
      id: 'rev-1',
      orderId: 'AB-20261124-AABB11',
      published: true,
      name_en: 'Bilal Ahmed',
      location: 'House 22, St 9, Gulberg III, Lahore',
      purchasedItem: 'Ajwa Dates',
      review: 'Fresh and cleanly packed.',
      rating: 5,
      phone: '03001234567',
      email: 'bilal@private.example',
      address: 'House 22, Street 9',
      photoUrl: 'https://firebasestorage.googleapis.com/v0/b/allbarka/o/review-uploads%2Fabc.webp?alt=media&token=t1',
      reply: 'Shukriya Bilal! Glad you enjoyed the Ajwa.',
      replyAt: '2026-11-24T12:00:00.000Z',
    },
    {
      id: 'rev-bad-photo',
      orderId: 'AB-20261124-AABB12',
      published: true,
      name_en: 'Sara K',
      location: 'Lahore',
      purchasedItem: 'Pista',
      review: 'Crunchy and roasted right.',
      rating: 4,
      photoUrl: 'javascript:alert(1)',
    },
  ]);

  assert.equal(projected.length, 2);
  assert.equal(projected[0].verifiedOrder, true);
  assert.equal(projected[0].location, 'Gulberg III, Lahore');
  assert.ok(projected[0].photoUrl?.startsWith('https://firebasestorage.googleapis.com/'));
  assert.equal(projected[0].reply, 'Shukriya Bilal! Glad you enjoyed the Ajwa.');
  assert.equal(projected[1].photoUrl, undefined, 'javascript: photo URL stripped');

  const serialized = JSON.stringify(projected);
  assert.doesNotMatch(serialized, /AB-20261124-AABB11|03001234567|bilal@private\.example|House 22/);
});

test('Reviews router enforces delivered-order verification, draft-by-default submit, PII isolation, cache invalidation, and audit logs', async () => {
  resetPublishedReviewsCache();
  const { db } = createMockFirestore();

  await db.collection('orders').doc('AB-20261124-A1B2C3').set({
    orderId: 'AB-20261124-A1B2C3',
    status: 'DELIVERED',
    createdAt: '2026-11-20T10:00:00.000Z',
    customer: { name: 'Ayesha Siddiqui', phone: '+923001119876', city: 'Lahore', area: 'DHA Phase 6' },
    items: [{ name: 'Ajwa Dates', productId: 'ajwa-dates', quantity: 1 }],
  });
  await db.collection('orders').doc('AB-20261124-D4E5F6').set({
    orderId: 'AB-20261124-D4E5F6',
    status: 'PREPARING',
    createdAt: '2026-11-23T10:00:00.000Z',
    customer: { name: 'Pending Buyer', phone: '03005554321', city: 'Karachi' },
    items: [{ name: 'Pista', productId: 'pista', quantity: 1 }],
  });

  const savedPhotos: Buffer[] = [];
  const requireAdmin: express.RequestHandler = (req, res, next) => {
    if (req.get('Authorization') !== 'Bearer admin-ok') {
      return res.status(403).json({ code: 'ADMIN_REQUIRED' });
    }
    (req as any).adminUser = { uid: 'admin-1', email: 'owner@allbarka.com' };
    return next();
  };

  const app = express();
  app.use(
    createReviewsRouter({
      getDb: () => db,
      getBucket: () => null,
      requireAdmin,
      savePhoto: async (img) => {
        savedPhotos.push(img.buffer);
        return `https://firebasestorage.googleapis.com/v0/b/allbarka/o/review-uploads%2Ftest.${img.extension}?alt=media&token=tok1`;
      },
    }),
  );

  const server = app.listen(0);
  const { port } = server.address() as { port: number };
  const base = `http://127.0.0.1:${port}`;

  try {
    // 1. Wrong phoneLast4 rejected with 404
    const wrongPhone = await fetch(`${base}/api/reviews/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: 'AB-20261124-A1B2C3',
        phoneLast4: '0000',
        name: 'Ayesha',
        area: 'DHA Phase 6, Lahore',
        item: 'Ajwa Dates',
        rating: 5,
        review: 'Wonderful quality dates, packed neatly.',
      }),
    });
    assert.equal(wrongPhone.status, 404);

    // 2. Non-delivered order rejected with 400 ORDER_NOT_DELIVERED
    const notDelivered = await fetch(`${base}/api/reviews/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: 'AB-20261124-D4E5F6',
        phoneLast4: '4321',
        name: 'Pending Buyer',
        area: 'Clifton, Karachi',
        item: 'Pista',
        rating: 5,
        review: 'Testing review before order delivery.',
      }),
    });
    assert.equal(notDelivered.status, 400);
    assert.equal((await notDelivered.json()).code, 'ORDER_NOT_DELIVERED');

    // 3. Valid delivered order submit with EXIF-laden WebP photo saves as DRAFT only
    const exifSecret = 'PRIVATE_GPS_31.4697_74.2728';
    const photoB64 = makeWebpWithExif(800, 600, exifSecret).toString('base64');
    const submitted = await fetch(`${base}/api/reviews/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: 'AB-20261124-A1B2C3',
        phoneLast4: '9876',
        name: 'Ayesha Siddiqui',
        area: 'House 8, St 3, DHA Phase 6, Lahore',
        item: 'Ajwa Dates',
        rating: 5,
        review: 'Fresh Ajwa dates and thoughtful gift packaging.',
        photoBase64: photoB64,
        photoMime: 'image/webp',
      }),
    });
    assert.equal(submitted.status, 201);
    const submitJson = await submitted.json();
    assert.equal(submitJson.status, 'draft');
    assert.equal(savedPhotos.length, 1);
    assert.equal(savedPhotos[0].includes(Buffer.from(exifSecret)), false, 'Uploaded customer photo had EXIF stripped');

    // 4. Duplicate submit for same order rejected with 409
    const dup = await fetch(`${base}/api/reviews/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: 'AB-20261124-A1B2C3',
        phoneLast4: '9876',
        name: 'Ayesha Siddiqui',
        area: 'DHA Phase 6, Lahore',
        item: 'Ajwa Dates',
        rating: 5,
        review: 'Second submission attempt for same order.',
      }),
    });
    assert.equal(dup.status, 409);

    // 5. Public GET /api/reviews must NOT expose draft review
    const pubBefore = await (await fetch(`${base}/api/reviews`)).json();
    assert.deepEqual(pubBefore.reviews, []);

    // 6. Non-admin cannot access admin review endpoints
    const unauth = await fetch(`${base}/api/admin/reviews`);
    assert.equal(unauth.status, 403);

    // 7. Admin search delivered orders returns ONLY delivered orders
    const deliveredRes = await (
      await fetch(`${base}/api/admin/reviews/delivered-orders?q=Ajwa`, {
        headers: { Authorization: 'Bearer admin-ok' },
      })
    ).json();
    assert.equal(deliveredRes.orders.length, 1);
    assert.equal(deliveredRes.orders[0].orderId, 'AB-20261124-A1B2C3');
    assert.equal(deliveredRes.orders[0].hasReview, true);

    // 8. Admin cannot create review for non-delivered or fake order
    const badCreate = await fetch(`${base}/api/admin/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-ok' },
      body: JSON.stringify({
        orderId: 'AB-20261124-D4E5F6',
        name_en: 'Fake',
        location: 'Lahore',
        purchasedItem: 'Pista',
        review: 'Should not allow undelivered order.',
        rating: 5,
      }),
    });
    assert.equal(badCreate.status, 400);

    // 9. Admin publishes draft + adds AllBarka reply → cache busts → public API serves it without orderId/PII
    const patchRes = await fetch(`${base}/api/admin/reviews/${submitJson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-ok' },
      body: JSON.stringify({
        published: true,
        reply: 'Thank you Ayesha — delighted it reached DHA safely.',
      }),
    });
    assert.equal(patchRes.status, 200);

    const pubAfter = await (await fetch(`${base}/api/reviews`)).json();
    assert.equal(pubAfter.reviews.length, 1);
    assert.equal(pubAfter.reviews[0].verifiedOrder, true);
    assert.equal(pubAfter.reviews[0].location, 'DHA Phase 6, Lahore');
    assert.equal(pubAfter.reviews[0].reply, 'Thank you Ayesha — delighted it reached DHA safely.');
    assert.ok(pubAfter.reviews[0].photoUrl?.includes('firebasestorage.googleapis.com'));
    const pubText = JSON.stringify(pubAfter);
    assert.doesNotMatch(pubText, /AB-20261124-A1B2C3|9876|House 8|owner@allbarka\.com/);

    // 10. Admin unpublishes → cache busts immediately → public API returns []
    const unpub = await fetch(`${base}/api/admin/reviews/${submitJson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-ok' },
      body: JSON.stringify({ published: false }),
    });
    assert.equal(unpub.status, 200);
    const pubAfterUnpub = await (await fetch(`${base}/api/reviews`)).json();
    assert.deepEqual(pubAfterUnpub.reviews, []);

    // 11. Admin deletes review + audit log contains customer_submit, publish, unpublish, delete
    const del = await fetch(`${base}/api/admin/reviews/${submitJson.id}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer admin-ok' },
    });
    assert.equal(del.status, 200);

    const adminList = await (
      await fetch(`${base}/api/admin/reviews`, { headers: { Authorization: 'Bearer admin-ok' } })
    ).json();
    assert.equal(adminList.reviews.length, 0);
    const actions = adminList.audits.map((a: any) => a.action);
    assert.ok(actions.includes('customer_submit'));
    assert.ok(actions.includes('publish'));
    assert.ok(actions.includes('unpublish'));
    assert.ok(actions.includes('delete'));
  } finally {
    server.close();
    resetPublishedReviewsCache();
  }
});

test('firestore.rules locks reviews and reviewAuditLogs to API-only (allow read, write: if false)', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  assert.match(rules, /match \/reviews\/\{reviewId\}\s*\{\s*allow read, write: if false;\s*\}/);
  assert.match(rules, /match \/reviewAuditLogs\/\{auditId\}\s*\{\s*allow read, write: if false;\s*\}/);
});

test('PatronVoicesSection renders photo, rating stars, and AllBarka reply; OrderReviewForm renders cleanly', () => {
  const voicesHtml = renderToStaticMarkup(
    <MemoryRouter>
      <LanguageProvider>
        <PatronVoicesSection
          reviews={[
            {
              id: 'rev-ui-1',
              verifiedOrder: true,
              published: true,
              name_en: 'Hamza Tariq',
              name_ur: 'حمزہ طارق',
              name_ar: 'حمزة طارق',
              location: 'Model Town, Lahore',
              purchasedItem: 'Royal Dry Fruit Hamper',
              headline: '',
              review: 'Beautiful rigid box and crisp pistachios.',
              rating: 5,
              avatarInitials: 'HT',
              photoUrl: '/images/products-premium/pista.webp',
              reply: 'Thank you Hamza, honored to serve your family.',
            },
          ]}
        />
      </LanguageProvider>
    </MemoryRouter>,
  );
  assert.match(voicesHtml, /data-testid="patron-voices-section"/);
  assert.match(voicesHtml, /Rated 5 out of 5/);
  assert.match(voicesHtml, /AllBarka reply/);
  assert.match(voicesHtml, /Thank you Hamza, honored to serve your family\./);
  assert.match(voicesHtml, /\/images\/products-premium\/pista\.webp/);

  const formHtml = renderToStaticMarkup(
    <LanguageProvider>
      <OrderReviewForm orderId="AB-20261124-A1B2C3" phoneLast4="9876" defaultArea="Lahore" />
    </LanguageProvider>,
  );
  assert.match(formHtml, /data-testid="order-review-form"/);
  assert.match(formHtml, /Leave a review/);
  assert.match(formHtml, /min-h-\[44px\]/);
});
