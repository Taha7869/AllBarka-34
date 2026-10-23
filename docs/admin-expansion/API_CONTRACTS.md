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

Stage 3 merges published taxonomy into the shop category/occasion controls and resolves custom category routes. The public response also includes `hiddenTaxonomy: [{ id, type }]` tombstones, without hidden labels/descriptions, so a hidden built-in category is not reintroduced by compiled defaults. Templates are applied explicitly in the item form. Later template changes do not rewrite existing items. No runtime background migration is performed.

## Stage 3 item and photo integration

The shared Add/Edit Item form calls the existing `POST /api/admin/catalog/products` and `PUT /api/admin/catalog/products/:id` routes. Editing requires a fresh server read and expected revision. A load failure blocks saving; a mutation failure preserves input. Duplicate IDs return `PRODUCT_ALREADY_EXISTS` and can be corrected in the new item's ID field. Publication remains a deliberate action; draft saving and preview are separate controls.

`POST /api/admin/catalog/uploads` accepts a raw JPEG/PNG/WebP body up to 5 MiB and authenticates an administrator before parsing it. MIME/signature checks reject unsupported payloads; PNG dimensions are bounded to 12,000 pixels per side. The existing Firebase Admin app and configured Storage bucket perform the durable write under a generated `catalog-uploads/` key with a generated Firebase download token. Response: 201 `{ url }`. Invalid media returns 400, oversized bodies 413, and unavailable storage 503 `MEDIA_STORAGE_UNAVAILABLE`. Provider errors do not expose credentials. Cookies are parsed before this guarded route; the ordinary JSON limit remains 128 KiB.

Uploaded photos are public product assets. The form stores only returned URLs in the product's cover/gallery, never base64 or local disk paths. Removing a gallery reference does not delete its underlying object; abandoned uploads require a separately planned cleanup policy. No upload, cleanup or live Storage provisioning was executed during development.

Product SEO now feeds the initial server HTML in English and localized client metadata after language selection, including canonical links, social image, description and keywords. Keywords are metadata, not a claim of search ranking. Custom category routes receive initial HTTP metadata and are included in the sitemap. Existing canonical product IDs remain stable.
