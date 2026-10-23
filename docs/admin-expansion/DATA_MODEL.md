# Data model and compatibility contract

Status: design contract; refine names with implementation and record changes. Existing collections remain authoritative.

## Products

Continue using `products/{id}` and the existing revision/audit lifecycle. IDs are stable. Keep legacy `prices`, canonical `variants`, localized product fields, shipping fields, publication status, MOQ, order mode and private fields compatible.

New optional configuration must be explicitly versioned. It describes selected template, typed attributes, measurement options, pricing method, custom-quantity settings and SEO. When absent, the product follows the original resolver. Server validation computes canonical final prices; browser-submitted totals never become authoritative.

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

Existing `merchandising` records retain their contract and listeners. Add content controls alongside them rather than replacing them. Validate internal destinations and references. Archive categories/templates instead of orphaning existing products.

## Media

Use the existing Firebase project/bucket configuration and authenticated server APIs for durable uploads. Accept bounded JPEG/PNG/WebP with verified content type, generated filenames and safe public display URLs. Do not store uploads on temporary Railway disk or store base64 image files in Firestore. If external storage is unavailable, show an accurate failure and preserve form input.

## Staff

Only a verified administrator can grant/revoke the order-reader role on an existing account. Retain unrelated custom claims. Staff role comes from authoritative identity, never an editable user profile. Order responses use a dedicated allowlist and omit claim credentials, integration payloads, staff-only audits and internal notes. Staff has no writes, export privilege or direct browser database access.

## Migration

Additive schema only. No automatic rewriting of existing products or owner prices. Preview affected records and invalid references before any future live activation. Old order snapshots and idempotent retries must keep their original amounts.
