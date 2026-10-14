# Firestore pricing and release procedure

Part 2 is a reviewable code change. No live Firestore records, rules, Railway settings or remote n8n workflows were changed while preparing it.

## Source and controls

- Firestore mode is the default. The server uses its already initialized database, including `FIRESTORE_DATABASE_ID`; it never opens a second default database for prices.
- `CATALOG_SOURCE=static` is an explicit rollback/offline test mode. It uses reviewed source defaults and ignores Firestore pricing. Do not leave this setting enabled if live owner editing is required.
- All 89 canonical product records and three hamper box records must be present and valid before the public Firestore catalogue is ready. Missing, invalid or unavailable pricing returns a safe 503 response; no new durable checkout falls back to static prices.
- The server shares two Firestore listeners per process. The browser shares one validated in-memory view, conditional ETags and active-tab refreshes every 30 seconds, plus focus/visibility/online refreshes. Propagation depends on normal connectivity; this is not an instantaneous browser broadcast.
- Final order transactions read only the current product/box records required by that cart. Quotes carry an item-and-total fingerprint: changing item prices requires reconfirmation even when the final sum is unchanged. Existing idempotent receipts are returned before any repricing or catalogue reads.

## Administration

Sign in with an account whose verified Firebase custom claim grants administration access. Open the administration catalogue and choose **Edit prices** for a product or hamper box.

The editor changes supported fixed portion prices, the existing wholesale unit rate, custom gram capability/rate/limits and product availability. Box editing changes the packaging fee and availability. All amounts are whole PKR: retail/box prices are 1–1,000,000; wholesale and a disabled custom rate may be zero. Custom limits remain 100–5,000g in 50g steps, following the existing custom-weight contract.

Give a 3–300-character change reason and save. A version digest detects both competing editor saves and direct Console changes. A conflict requires reloading current values. Each successful editor save atomically records before/after pricing, the verified actor UID, revision, time and reason. The editor shows the latest ten changes. Historical receipts keep their saved amounts; they are never repriced.

IDs, portion labels, shipping weights, media, names, coupons, reward benefits, points and inventory counts are outside this editor. Existing stock policy is unchanged. The current web checkout remains retail; the legacy wholesale rate is available to server quotes only after account eligibility is verified. A dedicated wholesale purchase flow remains a separate business/UI change.

## Firebase Console

Edit commercial fields on the canonical document. Prices must be numeric values, not strings. Keep every existing supported portion key. Do not add or remove portions here: their identity, shipping mass and media require a reviewed registry change.

Example product fields (amounts shown only as an example, not a request to replace current prices):

```json
{
  "prices": { "250g": 1490, "500g": 2850, "1kg": 5500 },
  "wholesale": 0,
  "active": true,
  "allowCustomWeight": true,
  "pricePer100g": 571,
  "minCustomWeightG": 100,
  "maxCustomWeightG": 5000
}
```

Example box: `catalogBoxes/box-wood` contains a numeric `price` and boolean `active`. The three supported IDs are `box-wood`, `box-velvet` and `box-tin`. Their names, capacities and images stay in the reviewed registry.

Fixed portions and the custom 100g rate are separate merchant-controlled prices. Custom gram costs retain the existing rounding up to the next Rs.5. Each 200g hamper selection retains the existing formula: its canonical 250g retail price × 200/250, rounded to the nearest whole rupee, plus the selected box fee. Wholesale retains the legacy fixed unit-rate convention; custom grams remain retail. Editing a 250g price does not silently rewrite the custom-weight rate.

Full legacy product documents are accepted when their commercial fields validate. Public responses reconstruct safe metadata and pricing; arbitrary stored supplier costs, notes, editor IDs and injected shipping/media fields are never copied. Deployed rules deny direct browser reads/writes of price records and audits; the Firebase Console and server Admin SDK remain authorized administrative paths.

Console changes refresh the storefront but do not create an editor audit. Use the admin editor when attributable before/after history is needed. Invalid Console data makes catalogue verification unavailable until the owner corrects it; the seed script reports invalid existing documents and does not overwrite them.

## Read-only and create-only migration

Use the existing server credentials and the explicitly selected Firebase project/database. No new dependency is required.

```bash
# Offline preview: no credentials, database reads or writes
node --import tsx scripts/migrate-products.ts --offline

# Read-only plan against the configured named database
node --import tsx scripts/migrate-products.ts

# After owner review: create only missing canonical records
node --import tsx scripts/migrate-products.ts --execute
```

Existing owner prices are preserved. Invalid existing records stop the migration without writes. Batch `create()` fails atomically if a concurrent editor creates a planned document before commit; reread the plan rather than overwriting that record. Seeding a completely empty database creates 89 products and three box records with the reviewed current defaults.

## APIs and AI/WhatsApp

`GET /api/catalog/snapshot` returns `{catalog, boxes, source, revision}` with a conditional ETag. The new storefront consumes this complete view. `GET /api/catalog` preserves the deployed bare-array contract and returns the same validated product prices for existing external clients. Both views have separate ETags.

Guarded admin endpoints:

- `GET /api/admin/catalog-prices/{products|boxes}/{id}`
- `POST /api/admin/catalog-prices/{products|boxes}/{id}` with `{expectedVersion, pricing, reason}`
- `GET /api/admin/catalog-prices/{products|boxes}/{id}/history`

Website quote/coupon/final order APIs and the website AI context all use validated pricing. AI context also includes current custom rates and hamper packaging/contents prices. Saved order notifications and WhatsApp receipts use persisted canonical amounts, not a later catalogue price.

For a remote WhatsApp/n8n pricing flow, the integration secret stays in server-side n8n credentials. New JSON POST endpoints are:

- `/api/integrations/n8n/catalog` with `{}`
- `/api/integrations/n8n/quote` with `{items, city, shippingMethodId, discountCode?, giftWrapping?}`

These use the existing `X-AllBarka-Integration-Secret` guard. They do not grant customer/admin identity or wholesale eligibility, create orders or send messages. Remote workflows must be configured to call these endpoints instead of their own price lists. The website AI workflow already accepts the trusted server-built context; its authenticated request format is unchanged. Remote workflow edits and live connectivity were not performed in this part.

## Reviewed release sequence

1. Release Part 1 and this stacked change in order after explicit release approval. A report-stage approval to start Part 3 is not production release authorization.
2. Check the actual Railway Firebase project, database and source-mode settings. Run the read-only seed plan and review the current owner records and missing defaults.
3. Create the approved missing records and correct any invalid existing values. Verify public Firestore readiness on staging before enabling live editing.
4. Deploy the reviewed server/frontend together and publish `firestore.rules` to the correct Firebase database. Railway deployment alone does not publish rules.
5. Verify an admin save, an independent Console update, all three languages, shop/product/cart/custom hamper prices and a quote-change reconfirmation on staging. Test duplicate order recovery and historical receipts without sending customer messages. Remove any temporary offline/static mode before relying on Firestore editing.
6. Configure any remote n8n/WhatsApp pricing consumers and verify them separately. Keep existing shipping, promotion and saved-order notification contracts.

The shipping policy is unchanged: Lahore standard Rs.150/free at discounted merchandise subtotal Rs.3,000; express Rs.350; the existing same-day rule; national actual canonical weight × Rs.250/kg, minimum Rs.250, without whole-kilogram rounding. Only ZAFRANI grants the existing national shipping waiver; oil billing remains 1ml=1g by merchant convention.
