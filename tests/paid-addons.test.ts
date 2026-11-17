import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import {
  STARTER_ADDONS,
  DEFAULT_ADDONS_CATALOG,
  MAX_VISIBLE_ADDONS,
  validateAddonDefinition,
  validateAddonsCatalog,
  matchAddonsForCart,
  validateAndPriceAddons,
  addonReceiptLines,
  type AddonDefinition,
} from '../src/lib/addonsCatalog';
import { createAddonsRouter } from '../src/lib/addonsRouter';
import { validateAndPriceOrder, ValidationError } from '../src/lib/orderValidation';
import { generateAuthoritativeWhatsAppMessage, type CanonicalOrder } from '../src/lib/serverOrderService';

test('STARTER_ADDONS: seeds 5 inactive draft add-ons with price 0 and active false in EN/UR/AR', () => {
  assert.equal(STARTER_ADDONS.length, 5);
  assert.equal(DEFAULT_ADDONS_CATALOG.revision, 0);

  const expectedIds = [
    'printed-card',
    'eidi-lifafa',
    'naam-sleeve',
    'glass-jar-upgrade',
    'wooden-tray',
  ];
  assert.deepEqual(STARTER_ADDONS.map(a => a.id), expectedIds);

  for (const addon of STARTER_ADDONS) {
    assert.equal(addon.price, 0, `${addon.id} should have starter price 0`);
    assert.equal(addon.active, false, `${addon.id} should be inactive draft by default`);
    assert.ok(addon.name_en.length > 0);
    assert.ok(addon.name_ur.length > 0);
    assert.ok(addon.name_ar.length > 0);
  }
});

test('validateAddonDefinition: prevents activating an add-on with price 0 and validates bounds', () => {
  const starter = STARTER_ADDONS[0];
  assert.throws(
    () => validateAddonDefinition({ ...starter, active: true, price: 0 }),
    (err: any) => err instanceof ValidationError && err.code === 'ADDON_ACTIVE_REQUIRES_PRICE'
  );

  // Activating with positive price succeeds
  const activated = validateAddonDefinition({ ...starter, active: true, price: 150 });
  assert.equal(activated.active, true);
  assert.equal(activated.price, 150);

  // Invalid min/max order bounds rejected
  assert.throws(
    () => validateAddonDefinition({ ...starter, minOrderValue: 5000, maxOrderValue: 2000 }),
    (err: any) => err instanceof ValidationError && err.code === 'INVALID_ADDON_ORDER_BOUNDS'
  );
});

test('matchAddonsForCart: filters by active status, order value, category/product, and occasion, returning max 4 sorted by relevance', () => {
  // With default inactive starter add-ons, nothing is shown
  const noneMatched = matchAddonsForCart({
    addons: STARTER_ADDONS,
    items: [{ productId: 'badam', quantity: 2 }],
    subtotal: 4000,
    occasionContext: { isGift: true, occasions: ['eid'] },
  });
  assert.equal(noneMatched.length, 0);

  // Activate all 5 starter add-ons plus 2 extra add-ons to test relevance ranking & max 4 cap
  const activeCatalog: AddonDefinition[] = [
    { ...STARTER_ADDONS[0], active: true, price: 120 }, // printed-card (fixed, gift/eid/nikah)
    { ...STARTER_ADDONS[1], active: true, price: 80 },  // eidi-lifafa (per_item, eid/gift/nikah)
    { ...STARTER_ADDONS[2], active: true, price: 200, categories: [] }, // naam-sleeve (per_item, gift/nikah/eid)
    { ...STARTER_ADDONS[3], active: true, price: 250, categories: ['Nuts', 'Dry Fruits'], productPriceOverrides: { badam: 300 } }, // glass-jar-upgrade
    { ...STARTER_ADDONS[4], active: true, price: 650, minOrderValue: 3000 }, // wooden-tray (minOrderValue 3000)
    {
      id: 'badam-gold-foil',
      name_en: 'Almond Gold Foil Seal',
      name_ur: 'بادام گولڈ فائل سیل',
      name_ar: 'ختم ذهبي للوز',
      price: 100,
      pricingMode: 'fixed',
      categories: [],
      productIds: ['badam'],
      occasions: ['eid'],
      minOrderValue: 0,
      maxOrderValue: null,
      active: true,
      sortOrder: 10,
    },
  ];

  // Order subtotal 4000 with 2x badam on Eid occasion
  const matched = matchAddonsForCart({
    addons: activeCatalog,
    items: [{ productId: 'badam', quantity: 2, category: 'Nuts' }],
    subtotal: 4000,
    occasionContext: { isGift: true, occasions: ['eid'] },
  });

  // Capped at MAX_VISIBLE_ADDONS (4)
  assert.equal(matched.length, MAX_VISIBLE_ADDONS);

  // Most relevant first: badam-gold-foil has direct product match (+100) + eid occasion (+50) = 150
  assert.equal(matched[0].addon.id, 'badam-gold-foil');
  assert.equal(matched[0].totalPrice, 100);

  // Below minOrderValue (2000 < 3000), wooden-tray is excluded
  const smallOrderMatched = matchAddonsForCart({
    addons: [activeCatalog[4]], // wooden-tray (minOrderValue: 3000)
    items: [{ productId: 'badam', quantity: 1 }],
    subtotal: 2000,
    occasionContext: { isGift: true },
  });
  assert.equal(smallOrderMatched.length, 0);
});

test('validateAndPriceOrder & validateAndPriceAddons: ignores client price and computes fixed, per-item, and product override prices server-side', () => {
  const customAddons: AddonDefinition[] = [
    {
      ...STARTER_ADDONS[0], // printed-card (fixed)
      active: true,
      price: 150,
    },
    {
      ...STARTER_ADDONS[3], // glass-jar-upgrade (per_item)
      active: true,
      price: 200,
      categories: [],
      productPriceOverrides: { pista: 250 }, // Pista override: 250 per item instead of 200
    },
  ];

  // Client tries to spoof price: 1 on both add-ons
  const order = validateAndPriceOrder({
    items: [
      { productId: 'pista', selectedWeight: '500g', quantity: 2, price: 10 }, // 2 units of pista
    ],
    city: 'Lahore',
    shippingMethodId: 'standard',
    selectedAddons: [
      { id: 'printed-card', price: 1, totalPrice: 1 },
      { id: 'glass-jar-upgrade', price: 1, totalPrice: 1 },
    ],
    addonsCatalog: customAddons,
  });

  // printed-card = 150 (fixed), glass-jar-upgrade = 250 * 2 = 500 (per_item with pista override) => addonsFee = 650
  assert.ok(order.addons);
  assert.equal(order.addons.length, 2);
  assert.equal(order.addons[0].totalPrice, 150);
  assert.equal(order.addons[1].unitPrice, 250);
  assert.equal(order.addons[1].quantity, 2);
  assert.equal(order.addons[1].totalPrice, 500);
  assert.equal(order.summary.addonsFee, 650);
  assert.equal(
    order.summary.total,
    order.summary.discountedSubtotal + order.summary.shipping + order.summary.giftWrapFee + 650
  );

  // WhatsApp & packing sheet lines include both add-ons
  const lines = addonReceiptLines(order.addons);
  assert.deepEqual(lines, [
    '• Add-on: Printed Message Card — Rs. 150',
    '• Add-on: Glass Jar Upgrade (× 2) — Rs. 500',
  ]);

  const sampleCanonical: CanonicalOrder = {
    schemaVersion: '2.0.0',
    orderId: 'AB-20261118-ADDON1',
    source: 'website',
    createdAt: '2026-11-18T10:00:00.000Z',
    createdAtMs: Date.parse('2026-11-18T10:00:00.000Z'),
    updatedAt: '2026-11-18T10:00:00.000Z',
    updatedAtMs: Date.parse('2026-11-18T10:00:00.000Z'),
    status: 'ORDER_RECEIVED',
    paymentStatus: 'UNPAID',
    paymentMethod: 'cod',
    uid: null,
    customer: {
      name: 'Bilal Lahore',
      phone: '03001234567',
      deliveryPhone: '03001234567',
      address: 'House 5, Street 10, Gulberg III',
      city: 'Lahore',
    },
    gifting: { giftWrapping: false, giftWrapFee: 0 },
    items: order.items,
    addons: order.addons,
    totals: order.summary,
    earnedPoints: order.earnedPoints,
  };

  const waText = generateAuthoritativeWhatsAppMessage(sampleCanonical);
  assert.ok(waText.includes('• Add-on: Printed Message Card — Rs. 150'));
  assert.ok(waText.includes('• Add-on: Glass Jar Upgrade (× 2) — Rs. 500'));
  assert.ok(waText.includes('Paid Add-ons: Rs. 650'));
});

test('createAddonsRouter: admin can price and activate starter add-ons and public route returns only active add-ons', async () => {
  const store = new Map<string, any>();
  const mockDb: any = {
    collection: (colName: string) => ({
      doc: (docId: string) => ({
        get: async () => ({
          exists: store.has(`${colName}/${docId}`),
          data: () => store.get(`${colName}/${docId}`),
        }),
         path: `${colName}/${docId}`,
      }),
    }),
    runTransaction: async (cb: any) => {
      const tx = {
        get: async (ref: any) => ({
          exists: store.has(ref.path),
          data: () => store.get(ref.path),
        }),
        set: (ref: any, data: any) => {
          store.set(ref.path, data);
        },
      };
      return cb(tx);
    },
  };

  const app = express();
  app.use(express.json());
  app.use(
    createAddonsRouter({
      getDb: () => mockDb,
      requireAdmin: (req, _res, next) => {
        (req as any).user = { uid: 'admin-1', admin: true };
        next();
      },
    })
  );

  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    // 1. Public GET initially returns 0 active add-ons because starter add-ons are inactive drafts
    const pub1 = await fetch(`http://127.0.0.1:${port}/api/catalog/addons`).then(r => r.json());
    assert.equal(pub1.ok, true);
    assert.equal(pub1.addons.length, 0);

    // 2. Admin GET returns all 5 starter add-ons at revision 0
    const adm1 = await fetch(`http://127.0.0.1:${port}/api/admin/catalog/addons`).then(r => r.json());
    assert.equal(adm1.ok, true);
    assert.equal(adm1.catalog.revision, 0);
    assert.equal(adm1.catalog.addons.length, 5);

    // 3. Admin prices and activates printed-card (Rs. 150) and eidi-lifafa (Rs. 100)
    const updatedAddons = adm1.catalog.addons.map((a: AddonDefinition) =>
      a.id === 'printed-card'
        ? { ...a, price: 150, active: true }
        : a.id === 'eidi-lifafa'
          ? { ...a, price: 100, active: true }
          : a
    );
    const putRes = await fetch(`http://127.0.0.1:${port}/api/admin/catalog/addons`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: 0,
        catalog: { revision: 0, addons: updatedAddons },
      }),
    }).then(r => r.json());
    assert.equal(putRes.ok, true);
    assert.equal(putRes.catalog.revision, 1);

    // 4. Public GET now returns the 2 active add-ons
    const pub2 = await fetch(`http://127.0.0.1:${port}/api/catalog/addons`).then(r => r.json());
    assert.equal(pub2.ok, true);
    assert.equal(pub2.addons.length, 2);
    assert.deepEqual(pub2.addons.map((a: any) => a.id), ['printed-card', 'eidi-lifafa']);
  } finally {
    server.close();
  }
});
