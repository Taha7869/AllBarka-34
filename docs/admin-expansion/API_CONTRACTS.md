# Stage 2 API and integration contract

These routes use the existing injected Firebase Admin database and existing admin authentication. No additional Firebase app, credential or production environment setting is introduced.

| Route | Access and response |
| --- | --- |
| `GET /api/admin/catalog/configuration` | Admin only; `{ configuration }`; `Cache-Control: no-store`. |
| `PUT /api/admin/catalog/configuration` | Admin only; body `{ expectedRevision, configuration }`; both revision values must match the current record. Returns the saved configuration with incremented revision. |
| `GET /api/catalog/taxonomy` | Public; `{ taxonomy, revision }`; only visible taxonomy entries, no templates or admin metadata; cache 30 seconds. |

Configuration saves use a transaction and audit write. Stale revision returns 409 `CONFIGURATION_CONFLICT`; missing store returns 503 `CATALOG_STORE_UNAVAILABLE`; invalid input returns 400 with a bounded code. Dropping an existing taxonomy/template entry returns `ARCHIVE_TAXONOMY_INSTEAD` / `ARCHIVE_TEMPLATE_INSTEAD`. Hide or archive instead. Admin mutation also requires an authenticated actor UID.

Products continue using the existing catalog lifecycle routes, revisions and audits. Submit the optional version-1 fields documented in `DATA_MODEL.md` through the product create/update flow. An explicit commerce save validates and builds canonical variants/prices/shipping weights. A metadata-only save does not regenerate prices. A publish transition validates the complete configured item; legacy products without configuration retain the prior contract.

The standalone legacy pricing endpoint rejects configured products with `USE_PRODUCT_OPTIONS_EDITOR`. The Stage 3 UI must send commerce and its manual/override canonical prices together through the full product editor, retaining expected product revision. Do not fall back to a competing client-side price list.

Custom measurement is resolved server-side from the configured unit/range/step/base rate, with canonical `Custom {quantity}{unit}` labels. Checkout ignores a submitted price and uses the authoritative resolver. Drafts, archived products, disabled options and old fixed labels for custom-only products cannot be bought by guessing their IDs/labels.

The settings endpoint does not yet change compiled customer navigation. New taxonomy must be merged into customer discovery in Stage 3. Templates are reusable form definitions; applying a template, selecting it and collecting attribute values remains explicit Stage 3 UI work. No runtime background migration is performed.
