# Handoff — `ag/20261124-premium-home-2a` (Phase 2A Live Premium Home + Site-Wide Visual Unification + Social/PWA + Verification)

- **Date:** 24 November 2026 (Asia/Karachi)
- **Author:** Antigravity
- **Branch:** `ag/20261124-premium-home-2a` (cut from `origin/claude/celebrations-foundation-20261112` at `6a44b0b`)
- **Deploy branch untouched:** `claude/celebrations-foundation-20261112`, `main`, and `launch` were NOT modified or pushed.
- **Firestore writes:** `0` (strictly read-only / code & static assets only).
- **Status:** Phase 2A (Fixes 1–4, 6 + 6-section Home + relocations), Add-on A (A.1–A.5), Add-on C (OG + PWA), and Add-on D (verification, health-copy sweep, 10 desktop/mobile captures, Lighthouse Mobile) are **COMPLETE** and ready for Claude review/merge. **Fix 5 (`05-kalmi-dates-macro.webp`) and Add-on B (16 branded product photos Batch 1)** were **SKIPPED cleanly** (no partial/placeholder commits) because the image-generation model quota returned `429 RESOURCE_EXHAUSTED` until **`2026-11-25T21:36:45Z`**.

---

## Commit Log (Sequential, Atomic)

1. `17fbd50` — **Phase 2A:** Promote calm 6-section premium homepage, tighten hero copy/crop, relocate non-home tools, scrub EN/UR/AR health claims in catalog & translations.
2. `bf54080` — **Add-on A.1:** Compact solid-on-scroll header (`<= 5` nav items) and emerald-gold mobile menu.
3. `7477a40` — **Add-on A.2:** Calm 3-column luxury footer (`Shop / Help / House`) with AllBarka crest, WhatsApp, area-level location (`Allama Iqbal Town, Lahore`), zero duplicate links.
4. `6e3bcc4` — **Add-on A.3:** Apply hero tokens across Shop (`/shop`, `/shop/:category`), PDP (`/product/:id`), and product cards (single `18px` radius, subtle resting shadow, hover = image zoom only).
5. `bf0fa54` — **Add-on A.4:** Unify Cart drawer, Cart page, Checkout, and Order Success on hero tokens + embossed wax-seal stamp reveal (`data-testid="order-seal-stamp"`, static under `prefers-reduced-motion`).
6. `166d880` — **Add-on A.5:** Branded AllBarka crest + single direct action button across all empty states (empty Cart drawer/page/Checkout, no search results, 404).
7. `d95a680` — **Add-on C:** 1200×630 branded OG image (`public/images/generated/og-image.jpg`), updated homepage OG/Twitter meta, and emerald/gold crest PWA icons (`icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`, `favicon.svg`) + portrait splash (`splash-screen.png`).
8. `c39b155` — **Add-on D:** Final site-wide health-word sweep (5 remaining UI files), SSR-only `/` hero preload in `src/lib/routeDocument.ts` (removed duplicate static preload from `index.html`, saving 83 KB on non-home routes), `stage5b-destinations.test.tsx` neutral label update, and 10 full-page desktop/mobile screenshots in `docs/design/`.

---

## Phase 2A Fixes Checklist

| Fix | Scope | Status | Detail |
| --- | --- | --- | --- |
| 1 | Remove `"Kashmiri saffron"` (unverified origin) | DONE | Replaced with `"Grade-A Sargol saffron"` matching `src/data/products.ts`. |
| 2 | Unified headline treatment + calm eyebrow | DONE | Single typographic treatment across hero headline (removed separate gold italic accent); sentence-case eyebrow (`Lahore gifting house`). |
| 3 | Hide mobile hero caption | DONE | `<figcaption>` hidden on mobile (`hidden sm:flex`) to prevent truncation. |
| 4 | Tighter desktop hero photo crop | DONE | Cropped `01-hero-gift-box-dates.webp` so the open emerald gift chest fills the frame with minimal empty dark margin. |
| 5 | Regenerate `05-kalmi-dates-macro.webp` (elongated Kalmi dates) | SKIPPED (Quota) | Image model returned `429 RESOURCE_EXHAUSTED` (resets `2026-11-25T21:36:45Z`). Live Home Dates Reserve tile uses authentic repo elongated Kalmi studio photo `public/images/catalog-intake-20261110/dates-dark-long.webp` cleanly in the interim. |
| 6 | Full EN/UR/AR health-word scrub | DONE | Scrubbed across 11 files (Phase 2A + Add-on D sweep — see table below). |

---

## Feature → New Location Map (Zero Features Deleted)

| Legacy Home Block / Tool | New Authoritative Location | Notes |
| --- | --- | --- |
| Full-width Home Hero + Lid Reveal | Live `/` (`PremiumHeroPrototype`) & `/preview/premium-home` | Promoted to live Home; preview route preserved (`noindex`). |
| Category Strip / 13-card carousel | `/` Section 2 (`SignatureCollectionsSection`: 6 curated tiles + `Explore all collections → /shop`) | All 13 categories remain reachable on `/shop` and header nav. |
| Auto-rotating Product Showcase | `/` Section 3 (`HouseSelectionsSection`: 3 manual tabs — Dry Fruits & Dates, Luxury Hampers, Celebration Boxes) | No auto-rotation; honors Admin merchandising visibility/overrides. |
| Gift Finder + Hamper Builder + Mehmaan / Shop-the-Table Planners | `/gifting` & `/occasions` (linked from `/` Section 4 `GiftingAtelierSection`) | Full interactive tools retained; zero features removed. |
| Home Inline FAQ Accordion | `/faq` (linked from `/` Section 5 `Lahore House Standard` & Section 6 `Patron Voices`) | Full searchable/accordion FAQ preserved at `/faq`. |
| Home Inline Search + Voice Strip | Global Header Search Panel (`HeaderSearchPanel`, `#header-search-btn`) | Accessible on every route with keyboard navigation & voice button. |
| Testimonials Carousel | `/` Section 6 (`Patron Voices`: 3 calm static customer quotes) | Zero auto-slide clutter on Home. |

---

## Health-Word Scrub Report (EN / UR / AR)

| Phase / Commit | File | What Was Replaced | Neutral Replacement Style |
| --- | --- | --- | --- |
| Phase 2A (`17fbd50`) | `src/data/products.ts` (91 line pairs) | `"antioxidant"`, `"antimicrobial"`, `"immunity"`, `"boosts"`, `"detox"`, `"cholesterol"`, `"blood sugar"`, `"digestion"`, `"medicinal"`, `"superfood"`, `"healing"` across EN/UR/AR descriptions, tags & bundle copy | Grade, kernel size, origin, roast/texture, flavor notes, `"gift-ready"`, traditional pantry use. Legacy internal IDs (`bundle-immunity-shield`) and test-pinned `oil-hairgrowth` `name_en` preserved for compatibility. |
| Phase 2A (`17fbd50`) | `src/data/articles.ts` (5 edits) | Health/superfood/immunity phrasing in editorial journal copy | Origin, culinary pairing, storage & tasting notes. |
| Phase 2A (`17fbd50`) | `src/data/catalogIntake20261113.json` (1 edit) | Health claim in intake note | Removed unverified claim. |
| Phase 2A (`17fbd50`) | `src/contexts/destinationTranslations.ts` (7 EN/UR/AR keys) | `"Wellness & Pantry Reserves"` (`filterWellness`) and wellness phrasing in EN/UR/AR | `"Pantry & Everyday Packs"` / `"پینٹری اور روزمرہ پیکس"` / `"باقات المؤونة اليومية"`. |
| Phase 2A (`17fbd50`) | `src/contexts/boutiqueTranslations.ts` (2 edits) | Health/wellness marketing copy | Pantry & gifting copy. |
| Phase 2A (`17fbd50`) | `src/contexts/LanguageContext.tsx` (1 edit) | Wellness wording | Neutral pantry wording. |
| Add-on D (`c39b155`) | `src/pages/InfoPage.tsx` (9 edits) | `"daily vitality essentials"`, `"cardiovascular and skin health"`, `"brain health and lowering LDL cholesterol"`, `"muscle recovery and immune function"`, `"restorative sleep"`, `"digestive health"`, `"Heart-Healthy Monounsaturated Fatty Acids"` | Grading standards, roast/crunch, flavor profile, portioning & storage care. |
| Add-on D (`c39b155`) | `src/components/InfoPagesModal.tsx` (9 edits) | `"Fueling Life with Pure Superfoods"`, `"heart-healthy fats"`, `"potent antioxidants"`, `"cardiovascular wellness"`, `"without insulin spikes"`, `"vitality capsules"` | Hospitality, grading, culinary & pantry heritage notes. |
| Add-on D (`c39b155`) | `src/components/Breadcrumbs.tsx` (1 edit) | `'Superfood Seeds'` / `'بیج اور غذائیت'` | `'Seeds & Pantry'` / `'بیج اور پینٹری'`. |
| Add-on D (`c39b155`) | `src/components/CategoryQuickPills.tsx` (1 edit) | `'Superfood Seeds'` | `'Seeds & Pantry'`. |
| Add-on D (`c39b155`) | `src/components/AllBarkaNavbarDemo.tsx` (1 edit) | `'Superfood Seeds & Wellness'` | `'Seeds & Pantry Essentials'`. |

*Verified non-claim exceptions intentionally left untouched:* `شفافیت` (transparency), `السكري` (Sukkari date cultivar), `شفا کی دعا` (get-well gift box name), and mandatory blood-pressure safety notice on licorice root (`catalogIntake20261114.json:391`).

---

## Visual Captures & Branded Assets

All 10 full-page screenshots captured via headless Chromium against production `build/server.cjs` (`ALLBARKA_SKIP_LOCAL_ENV=true`, `overflow=0`, `brokenImgs=0`, Cookie banner dismissed via valid consent record) and visually inspected:
- **Home:** [home-2a-desktop.png](../design/home-2a-desktop.png) · [home-2a-mobile.png](../design/home-2a-mobile.png)
- **Shop:** [shop-2a-desktop.png](../design/shop-2a-desktop.png) · [shop-2a-mobile.png](../design/shop-2a-mobile.png)
- **PDP (`/product/pista`):** [pdp-2a-desktop.png](../design/pdp-2a-desktop.png) · [pdp-2a-mobile.png](../design/pdp-2a-mobile.png)
- **Cart (`/cart`):** [cart-2a-desktop.png](../design/cart-2a-desktop.png) · [cart-2a-mobile.png](../design/cart-2a-mobile.png)
- **Checkout (`/checkout`):** [checkout-2a-desktop.png](../design/checkout-2a-desktop.png) · [checkout-2a-mobile.png](../design/checkout-2a-mobile.png)
- **Social / PWA Assets:** `public/images/generated/og-image.jpg` (1200×630), `public/icon-192.png`, `public/icon-512.png`, `public/icon-512-maskable.png`, `public/apple-touch-icon.png`, `public/splash-screen.png`, `public/favicon.svg`.

---

## Verification Evidence

- **`npm run typecheck` (`tsc --noEmit`):** `0` errors
- **`npm run lint:hooks` (`eslint src`):** `0` errors (3 pre-existing warnings)
- **`npm run build`:** PASS (`Release privacy audit passed (126 text artifacts; no private values printed).`)
- **Targeted regression checks:**
  - `tests/route-document.test.ts`: **6 pass / 0 fail**
  - `tests/stage5b-destinations.test.tsx`: **11 pass / 0 fail**
  - `tests/pwa-manifest.test.ts`: **3 pass / 0 fail**
  - `tests/admin-finishing-browser.test.tsx` (standalone rerun after transient parallel load timing): **1 pass / 0 fail**
- **Full offline test suite (`ALLBARKA_SKIP_LOCAL_ENV=true node scripts/run-all-tests.mjs`):**
  - Backend hardening suite: **11 PASSED, 0 FAILED**
  - Main suite: **`ℹ tests 1014` · `ℹ pass 1011` · `ℹ fail 2` · `ℹ skipped 1`** (1 emulator-only skip; 1 known Windows-only POSIX `SIGTERM` shutdown assertion in `tests/dev-server.test.mjs:54`; 1 transient timing flake in `tests/admin-finishing-browser.test.tsx:95` which passed **1/1** standalone immediately after). **0 application regressions.**
- **Lighthouse Mobile (local uncompressed `build/server.cjs`, `ALLBARKA_SKIP_LOCAL_ENV=true`):**
  - **Home (`/`):** Accessibility **100** (`0` failing audits) · SEO **100** (`0` failing audits) · CLS **0.017** · Performance **48** (`FCP 3.3s`, `TBT 720ms`, `LCP 22.6s` simulated slow-4G over uncompressed local Express `index.js` `890 KiB` raw / `265 KiB` gzip + `LuxuryPreloader`; Cloudflare/Railway edge gzip serves ~3.3× smaller JS/CSS in production).
  - **PDP (`/product/pista`):** Accessibility **100** (`0` failing audits) · SEO **100** (`0` failing audits) · CLS **0.028** · Performance **56** (`FCP 3.3s`, `TBT 420ms`, `LCP 13.9s`, `totalBytes 2,614 KiB` — saved `83 KiB` after removing duplicate static hero preload from `index.html`).

---

## Remaining Work (Pending Image Quota Reset `2026-11-25T21:36:45Z`)

1. **Fix 5:** Regenerate `public/images/drafts-premium-20261122/05-kalmi-dates-macro.webp` showing authentic elongated dark-brown Kalmi dates (not round) and wire it into `SignatureCollectionsSection.tsx` Dates tile.
2. **Add-on B (Batch 1 — 16 Branded Product Photos):** Generate studio branded packaging photos (travertine, emerald linen, gold AB crest, real product appearance, clean `"AllBarka"` + product name label) for the 16 flagship/bestseller products (Ajwa, Medjool, Kalmi, Mamra almonds, kaju, pista, akhrot, anjeer, Sargol saffron, Sidr honey, Gold/Platinum hamper, Eid box, Celebration box, Mehmaan table box, chai), build `docs/design/batch1-montage.jpg`, and hold for owner review before swapping live product images.
3. **Production Performance Follow-up:** Re-measure live Lighthouse Mobile on `allbarka.com` after Claude merges `ag/20261124-premium-home-2a` (with Cloudflare/Railway Brotli/Gzip active) and consider further bundle splitting / deferring `LuxuryPreloader` for sub-2.5s real-4G mobile LCP.
