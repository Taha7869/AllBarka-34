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

## Stage 4 staff routes

`GET /api/staff/access` returns only the caller's `orders_read` access. `GET /api/staff/orders` supports bounded page/limit/status/range/search/cursor filters; `GET /api/staff/orders/:id` returns the dedicated staff order projection. All require verified bearer identity, a fresh enabled Auth account, a non-revoked sign-in, and an authoritative server-only grant (or fresh admin identity). Reader email must remain verified. Every response is `no-store`. Other staff methods and export are denied.

Admin-only `GET /api/admin/staff` lists at most 200 grant records with truncation disclosure. `POST /api/admin/staff/lookup` takes `{ email }` for an existing verified non-admin account. `PUT /api/admin/staff/:uid` takes exactly `{ enabled, expectedRevision }`; stale revision returns 409 `STAFF_REVISION_CONFLICT`. The grant and `staffAccessAudits` entry commit atomically. Fresh admin account authority is required in addition to the existing guard. No Firebase claims are changed, no account is created and no invitation is sent. Existing default-deny database rules cover the server-only grant/audit collections; no live rules were published.

## Stage 5 storefront content routes

`GET /api/storefront-content` returns `{ content, revision }` from the live version only, without editor/audit identity. Hidden article bodies are removed and only their slugs remain as tombstones to prevent a compiled article from reappearing. `GET /api/admin/storefront-content` returns the validated draft/live bundle and revisions. All routes use `no-store`.

Admin-only `POST /api/admin/storefront-content/draft` takes `{ expectedRevision, content }`; `POST /api/admin/storefront-content/publish` takes `{ expectedRevision }` and publishes the saved draft after publish-specific validation. Each transaction checks the current revision, updates the settings record and writes an audit snapshot atomically. A stale save returns 409 `CONTENT_REVISION_CONFLICT`; unavailable storage is an honest 503. The public route never consumes the draft.

The version-1 content schema controls an optional text announcement, optional custom hero copy/images/CTA destinations, one ordered visibility entry for each approved homepage section, primary navigation overrides, up to 30 FAQ records and up to 30 journal edits/additions. Aggregate content is capped at 100,000 UTF-8 bytes, fitting the existing 128 KiB request limit and the doubled draft/live document. New links are restricted to store routes; private/API/external destinations and path traversal are rejected. Images use the existing safe URL validator. Content contains no authoritative prices.

Existing default hero and primary navigation remain when custom content is disabled/unset. Primary nav changes retain existing dropdown actions/links; a changed destination is exposed as a real destination link in both desktop and mobile menus. Homepage hero/assurance identity remains fixed; collections/showcase/occasions/care/reviews/FAQ have validated order/visibility, with no duplicate product showcase. Existing category/merchandising services continue to own their respective settings.

Journal slugs are stable after saving. Hide an article rather than deleting its saved entry; unpublished title/body are not returned publicly. Existing compiled articles remain unless explicitly edited/hidden. Edited content is plain text with separate locales and English display fallback; no raw HTML execution or automatic translations. Initial HTTP article metadata and sitemap use published content. CMS hero/article images are URL-based; the product editor's authenticated file upload remains available for catalog photos.
