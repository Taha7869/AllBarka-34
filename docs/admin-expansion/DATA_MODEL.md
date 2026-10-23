# Data model and compatibility contract

Status: Stage 2 data/service implementation. Media upload, staff and content sections below remain contracts for later stages. Existing collections remain authoritative.

## Products

Continue using `products/{id}` and the existing revision/audit lifecycle. IDs are stable. Keep legacy `prices`, canonical `variants`, localized product fields, shipping fields, publication status, MOQ, order mode and private fields compatible.

New optional configuration must be explicitly versioned. It describes selected template, typed attributes, measurement options, pricing method, custom-quantity settings and SEO. When absent, the product follows the original resolver. Server validation computes canonical final prices; browser-submitted totals never become authoritative.

Implemented optional product fields are `commerce`, `attributes`, `templateId`, `seo` and `galleryImages`. Types live in `src/lib/productCommerce.ts`; schema and public allowlists live in `catalogSchema.ts`. Existing keywords remain the keyword field. Missing Urdu/Arabic content stays empty in storage; English fallback is a display concern.

`commerce` version 1 contains `kind` (food/liquid/packaging/gift), `pricingMode` (manual/calculated), `quantityMode` (fixed/custom/both), nullable `baseQuantity`/`basePrice`, `baseUnit`, `options` and nullable `custom`.

- Each of at most 20 options has `label`, `quantity`, `unit`, `override`, `available`, nullable integer `shippingWeightG`, optional `moqOverride` and optional `piecesPerPack`. The last field means total physical pieces in one purchasable option; a pack does not imply a piece count.
- Custom configuration has `unit`, `min`, `max`, `step` and nullable `shippingWeightGPerUnit`. Steps are measured from `min`. Custom measurement supports food/liquid mass or volume; gifts/packaging use fixed options and the existing order quantity/MOQ flow. Count custom measurement is rejected.
- Quantities allow six decimal places. Calculated prices use exact integer-rational arithmetic and half-up rounding once to whole PKR. Positive prices are capped at PKR 10,000,000. Legacy custom-gram rounding is unchanged.
- On explicit configuration save, manual/override prices come from canonical `prices`; calculated options are regenerated from the approved base rate. Metadata-only edits preserve saved canonical prices. There is no second final-price array in `commerce`.
- Custom-only products receive a minimum-quantity canonical option for existing starting-price displays. Fixed labels on custom-only products are rejected by purchase resolution.
- Explicit drafts can have empty prices. Inquiry-only published products can remain unpriced. Standard publication requires English identity/description/category, cover image, required attributes, valid available option prices and approved shipping weights. Packaging requires at least 10 preparation days and explicit pieces for pack units.
- Attributes are bounded to 24 typed text/number/select entries. Localized SEO title/description/alt text and social image, plus up to 12 gallery URLs, are validated and whitelisted. Rendering/editing these extensions is Stage 3 work.

Saved canonical variants/prices remain the storefront, quote, order and integration authority. Existing configured products reject the old standalone price-editor endpoint (`USE_PRODUCT_OPTIONS_EDITOR`); Stage 3 must route their UI to the complete options editor. Direct stored configuration changes also affect the catalog fingerprint so stale quotes cannot silently reuse the old configuration.

| Concept | Meaning and validation |
| --- | --- |
| Unit | mg/g/kg are mass; ml/L are volume; pieces/packs are counts. Convert only within a dimension. |
| Fixed option | Quantity + unit, canonical label, enabled flag, saved price or explicit calculated-rate override, approved shipping weight and existing MOQ override. |
| Calculated rate | Positive base amount, compatible base unit and positive PKR rate. Document rounding; preserve legacy rounding when the new configuration is absent. |
| Custom quantity | Product-opted-in unit, positive minimum/maximum/increment and configured rate. Server checks range and step. No invented shipping mass for volume/count products. |
| Shipping | Retain canonical billing weights and existing oil tariff. Fixed gifts/packaging require explicit approved shipping mass. |
| Attributes | Bounded definitions and values; text, number or selection types. Labels are localized. Never interpret values as HTML or executable formulas. |
| SEO | Localized title/description/image alt text; keywords; validated social image. Stable product-ID canonical route remains functional. |
| Draft | Minimum valid identity can be saved without complete purchase details. Public endpoints exclude it. Publishing checks sale-mode-specific required fields. |
| Stock | Existing 9999/unlimited convention remains; no new stock ledger in this phase. |

## Settings and content

Use server-managed, revisioned settings records for reusable templates, taxonomy extensions and storefront content. Published views expose only whitelisted published fields; admin previews may include drafts. Keep prices in products, never in banners/menus/merchandising.

Stage 2 implements `catalogSettings/main` with `version: 1`, a nonnegative integer `revision`, up to 50 templates and up to 150 taxonomy entries. Missing records return revision-0 defaults sourced from the current registry plus food/liquid/packaging/gift templates. Templates carry localized names, kind, default category/unit, archived status and attribute definitions. Taxonomy entries carry category/collection/occasion type, stable ID, localized names/descriptions and visibility. Existing entries must be archived/hidden rather than deleted. Successful saves increment the revision and write `catalogAudits` atomically. See `API_CONTRACTS.md`. Storefront discovery integration is Stage 3; content records are Stage 5.

Existing `merchandising` records retain their contract and listeners. Add content controls alongside them rather than replacing them. Validate internal destinations and references. Archive categories/templates instead of orphaning existing products.

## Media

Use the existing Firebase project/bucket configuration and authenticated server APIs for durable uploads. Accept bounded JPEG/PNG/WebP with verified content type, generated filenames and safe public display URLs. Do not store uploads on temporary Railway disk or store base64 image files in Firestore. If external storage is unavailable, show an accurate failure and preserve form input.

## Staff

Only a verified administrator can grant/revoke the order-reader role on an existing account. Retain unrelated custom claims. Staff role comes from authoritative identity, never an editable user profile. Order responses use a dedicated allowlist and omit claim credentials, integration payloads, staff-only audits and internal notes. Staff has no writes, export privilege or direct browser database access.

## Migration

Additive schema only. No automatic rewriting of existing products or owner prices. Preview affected records and invalid references before any future live activation. Old order snapshots and idempotent retries must keep their original amounts.
