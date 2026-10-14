# Storefront experience and release guide

Part 4 extends the reviewed pricing and commerce branches with smaller catalogue refreshes, route metadata, keyboard/mobile improvements, translated checkout labels and optional consent-based measurement. No package dependency was added. Review the separate Part 4 report for the final verification record.

## Catalogue delivery and transfer budgets

The shared client requests `GET /api/catalog/snapshot?format=pricing-v1`. This sends commercial fields, availability, box fees and revision information; public descriptions and media are reconstructed from the reviewed registry already shipped with the application. The strict decoder still checks completeness, ranges and product identities. Corrupt or missing prices remain unavailable rather than becoming stale static defaults.

The old `/api/catalog` array and full `/api/catalog/snapshot` envelope remain available for existing integration clients. Format-specific ETags prevent a cached full response from satisfying a compact request. Unknown format values return 400. The client accepts the full envelope during a rolling server deployment.

The canonical static fixture is 520,681 bytes as a full JSON envelope and 15,615 bytes compact, about 97% less JSON per changed catalogue response. Actual live responses vary with owner prices and availability. This reduces repeated refresh traffic; it does not eliminate the static product registry download.

Vite places that registry in `catalog-data`, independently cached with the other hashed chunks. `scripts/verify-performance-budget.mjs` reads the build manifest and includes the entry's recursive static JavaScript imports: entry gzip must stay below 105 KiB and the static graph below 300 KiB. These are transfer guards, not a Core Web Vitals score, and exclude CSS, images, dynamic routes and optional authentication. Splitting a chunk does not by itself reduce total startup bytes. The existing optional Firestore chunk still exceeds Vite's 500 kB warning threshold.

Normal visits skip the old timed full-screen introduction. The owner/demo-only `?preload=1` intro remains once per browser session, respects reduced motion and shares the reference-counted scroll lock with drawers. Only the homepage preloads its responsive hero image; the hero is eager with high fetch priority.

## Routes, metadata and crawlers

`src/lib/routeMetadata.ts` owns route titles, descriptions, canonical paths, schema and indexing rules. The production Express server renders these into the document head before sending HTML, so product/article share previews do not depend on JavaScript execution. `SEO` updates the same metadata after client-side navigation and removes stale route schema.

This is server-rendered head metadata; the page body remains a React SPA. Client-only static hosting must supply equivalent route heads/statuses/crawler documents itself. Merely uploading `dist-client` does not reproduce the Express behavior.

- `APP_URL` defines the public origin; Railway's public domain is the fallback, then `https://allbarka.com`. Never use an untrusted request Host header. Configure staging's own origin.
- Category/info aliases share canonical public paths. Empty search queries and marketing parameters do not enter heads; nonempty shop search results are noindex.
- Cart, checkout, order confirmation and administration are noindex in HTML and in direct server responses. Private query parameters never enter heads or measurement page views.
- Unknown products, categories, pages, policies and articles return HTTP 404 and a recovery page with noindex.
- Product schema uses the current verified cached price and availability when available. Cold/unavailable live pricing produces no advertised offer. Quote-only products have no offers. No invented ratings, opening hours, coordinates or fresh modification dates are supplied.
- `/robots.txt` and `/sitemap.xml` use the configured origin. Only canonical public routes appear in the sitemap. Private shopping routes remain crawlable so crawlers can read their noindex; APIs/admin are disallowed.

`src/data/articleIndex.ts` contains only editorial metadata for six articles. When editing an article's title, excerpt, image or slug, update this index in the same change; the integrity test catches disagreement with the canonical article collection.

## Navigation and multilingual recovery

The existing desktop navigation uses genuine route links and an accessible collection disclosure. Enter/click, Escape, focus/blur and ArrowDown behavior are implemented; modified link clicks retain browser behavior. Added controls use 44px targets and theme tokens. Existing mobile menu navigation no longer invokes two competing route handlers.

A keyboard-visible skip link targets the focusable main content. Route changes announce a translated label and try to focus the new heading after lazy content loads, while respecting active dialogs. A reactive reduced-motion preference controls the cart animation. Mobile form text uses a 16px minimum to avoid input zoom. Gifting content follows the selected RTL direction.

English, Urdu and Arabic dictionaries cover the new navigation/privacy/recovery labels and key checkout/receipt steps and hints. This is not a claim that every legacy string on every page has been translated. Safe error recovery gives translated retry/home actions without displaying exception details.

## Optional measurement

Keep `ANALYTICS_MEASUREMENT_ID` unset for release unless the owner approves activation. This server variable accepts only a public GA4 ID of the form `G-...`; existing Firebase configuration does not automatically enable it. `/api/site/config` exposes only the validated ID or null and caches it for five minutes. The server's Google tag/network CSP allowances are added only when configured.

Before activating an approved property:

1. Turn off **Enhanced Measurement**, including automatic page/history, site-search, form and click/download measurement, in the GA4 web stream. Keep Google Signals, advertising personalization and any added tags/integrations off. The app's allowlist does not control features enabled remotely in the provider console.
2. Confirm the property, access and intended retention settings with the owner. Set the approved ID on staging, then redeploy; the configuration is read at server start.
3. In a real browser, confirm zero Google tag/collection requests before an explicit opt-in, including refresh and essential-only choice. Verify consent changes across tabs, cookie deletion and blocked storage/tag behavior.
4. Check opt-in events in the approved test property, including COD/unpaid bank orders, discounts, custom hampers, cancelled consent and quote enquiries. Check the actual network payloads for unexpected automatic events, full URLs, contact/order/account fields or provider-added data before production activation.

The optional banner offers equally prominent essential-only and allow-measurement choices. Its native dialog is available through the public footer. Consent is versioned in local storage; unavailable storage defaults to unknown/off. The tag loads only after both valid configuration and explicit consent. Advertising consent is denied. Revocation fences pending loads, disables further application events and attempts to expire GA cookies.

The application sends only allowlisted `page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase` and `web_vital` events. Registry product identities/names, quantities and numeric values are allowed. Query strings, referrer, search text, names, phones, addresses, notes, gift recipients, account IDs, auth/claim tokens and actual order IDs are excluded from application event payloads. Private/unknown page views are suppressed. Commerce events from checkout use a generic public `/shop` location.

Checkout measurement uses verified quoted/receipt items. Discounts are allocated proportionally across unit prices and the event value is discounted merchandise, excluding shipping and gift wrapping. Shipping is separate. No coupon text is sent. A purchase means a **durably accepted payable order**, including unpaid COD/bank orders; it is not paid revenue, delivery confirmation or a financial ledger. Quote enquiries, persistence failures and historical success-page replays do not emit purchases.

Purchase markers use a SHA-256 order fingerprint locally and a random UUID for the transmitted transaction. Reservation before asynchronous transport deduplicates concurrent retries in one browser tab/session. Failed transports release the marker. This is best-effort session deduplication, not cross-tab/server deduplication or exactly-once provider delivery. Storage/crypto/provider failures cannot reject checkout. Existing Google Analytics cookies and browser/provider behavior require real-browser inspection before activation.

Optional document LCP and CLS observers run after opt-in, send numeric values only and disconnect on revocation. CLS uses the largest five-second session window. No INP, full SPA navigation metrics, Lighthouse score or proven field-performance improvement is claimed.

## Staged release checklist

1. Review Parts 1–4 in order and approve the intended combined release. All checkpoint PRs are draft until reviewed. Retarget stacked PRs as earlier stages are integrated and inspect their remaining diffs.
2. Follow [FIRESTORE_PRICING.md](FIRESTORE_PRICING.md) and [COMMERCE_OPERATIONS.md](COMMERCE_OPERATIONS.md): verify the configured named database, inspect existing price records, review rules/indexes, approve create-only seeding and rehearse migrations/recovery on staging. Inventory remains unlimited unless deliberately enabled with approved counts.
3. Run build, TypeScript, hooks lint and the complete offline suite on the final release commit. Confirm staging health/readiness and exact origin/CORS/OAuth/CSP configuration with measurement disabled.
4. Complete real-browser review at 360/390px mobile, tablet and desktop in English/Urdu/Arabic, light/dark and reduced motion. Cover catalogue loading/failure, menu/drawer/dialog focus and Escape, skip/route focus, search, changed prices/availability, discount/reward checkout, guest/signed-in retries, receipt reload and error recovery. Check contrast and screen-reader announcements. Run Lighthouse and inspect actual resource transfer and LCP before setting performance claims.
5. Verify signed-in admin price/stock edits, direct Console updates, quote fingerprint conflicts, durability, stock/voucher contention, cancellation and n8n delivery against approved test services. Offline fixtures are not a live database/load benchmark.
6. After review, obtain the owner's separate production release approval. Merge/deploy the reviewed commit, publish approved rules/indexes and run only approved migrations/workflows. Confirm production readiness, browser behavior and order operations before broader traffic.

Rollback must follow the earlier commerce guide: a pre-Part-3 binary cannot safely manage new tracked reservations/reward fulfilment. Static catalogue mode is an explicit diagnostic/rollback choice and disables owner price edits; it is not a silent fallback for invalid Firestore data. Remove the measurement environment variable and redeploy to disable provider configuration, allowing for the five-minute config cache and already-open tabs.

No merges, deployments, live price/stock changes, Firebase publication/migration or remote n8n activation are part of this checkpoint.

Implementation references: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Google basic consent mode](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic), [web.dev image loading](https://web.dev/articles/browser-level-image-lazy-loading), [web.dev fetch priority](https://web.dev/articles/fetch-priority).
