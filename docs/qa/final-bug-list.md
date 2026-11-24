# AllBarka Final Launch QA — Bug List & Verification Log

- **Branch:** `ag/20261126-final-polish`
- **Inspected Build:** Local production build (`npm run build` → `build/server.cjs`, offline `ALLBARKA_SKIP_LOCAL_ENV=true`)
- **Automated Coverage:**
  - **34 routes crawled** at `375×812` & `1440×900` (`/`, `/shop`, all 12 categories, 5 random PDPs + `bid-box-umrah-tabarruk` + `gold-hamper`, `/gifting`, `/occasions`, `/wholesale`, `/cart`, `/checkout`, `/success`, `/track`, `/faq`, `/story`, `/policies`, `/policies/shipping`, `/does-not-exist-404`, `/offline`).
  - **168 responsive/i18n/theme matrix states** (`7 core routes × 4 viewports [375, 390, 768, 1440] × 3 languages [EN, UR RTL, AR RTL] × 2 themes [light, dark]`).
  - **192 unique internal links** crawled (0 HTTP 4xx/5xx).
  - **Interactive flows audited:** price parity (`Shop Card → PDP → Cart → Checkout`), currency switching (`PKR/GBP/USD/AED`), Roman Urdu search aliases (`badam`, `kaju`, `khajoor`, `pista`), filter & sort sheet, modals/drawers (`HeaderSearch`, `MobileMenu`, `CartDrawer`, `AIConcierge`, `CookieNotice`), checkout validation (empty submit, international phone → Pakistan delivery prompt, invalid coupon), track order invalid ID, empty states (`/cart`, `/shop?saved=1`, `/shop?search=zzznonexistent999`, `/does-not-exist-404`, `/offline`, 0-review Patron Voices), fast scroll reveal (zero blank viewports), dark mode contrast, and `prefers-reduced-motion: reduce`.

## Summary of Clean Checks (Zero Defects Found)
- Horizontal overflow (`scrollWidth > innerWidth`): **0 across all 34 routes & 168 matrix states**
- Broken images (including all 97 images on `/wholesale`): **0 broken / 0 image 404s**
- Broken internal links: **0 of 192**
- Uncaught JS page errors (`pageerror`): **0**
- Duplicate PDP portion chips: **0** (fixed in Part 1, `bf0002e`)
- Wide letter-spacing (`> 0.035em`): **0** (fixed in Part 1, `cf3702e`)
- Untranslated raw i18n keys (`EN/UR/AR`): **0**
- Dark mode contrast `< 3.0`: **0**
- Blank viewports on rapid scroll: **0**
- Continuous animations under `prefers-reduced-motion: reduce`: **0**
- Post-consent AB AI overlaps across 12 routes (`scrollY=0, 420, 840`): **0**
- *Note on offline API 503s:* Spawning `build/server.cjs` with `ALLBARKA_SKIP_LOCAL_ENV=true` intentionally runs without live Firestore credentials, so `/api/catalog`, `/api/storefront-content`, `/api/product-media`, `/api/catalog/taxonomy` return `503` and the storefront cleanly falls back to bundled catalog data without crashing.

---

## Discovered Bugs & Fix Verification (`7 found / 7 fixed`)

### High

- **BUG-01 — First-visit Cookie Consent banner floats 84px above bottom and collides simultaneously with floating AB AI launcher**
  - **Routes / Viewports:** `/shop`, `/product/pista`, and all storefront routes at `375px` / `390px` (first visit before consent choice).
  - **Symptom:** `CookieNotice` used `bottom-[calc(5.25rem+env(safe-area-inset-bottom))]` on mobile, leaving an 84px gap at the bottom while `RootLayout` kept the floating AB AI launcher mounted simultaneously. Two floating overlays appeared at once, and AB AI peeked out beneath the cookie sheet directly over `/shop` card `<select>` (`250g`) and `/product/pista` `<h1>`.
  - **Before:** [qa-cookie-ab-collision.png](screenshots/qa-cookie-ab-collision.png), [ai-overlap-375-_shop.png](screenshots/ai-overlap-375-_shop.png), [ai-overlap-375-_product_pista.png](screenshots/ai-overlap-375-_product_pista.png)
  - **After:** [qa-bug01-05-fixed-shop-375.png](screenshots/qa-bug01-05-fixed-shop-375.png) (`bannerBottomGap=12px`, `bannerHeight=159px`, `aiVisibleDuringConsent=false`)
  - **Status:** **FIXED** + `3d00c1e` (re-verified via headless Chromium + `tests/consent-manager.test.tsx` 3/3 pass)

### Medium

- **BUG-02 — `RootLayout` missing visible-on-focus "Skip to main content" link (`#main-content`)**
  - **Routes / Viewports:** All customer routes (`375px` – `1440px`, keyboard navigation).
  - **Symptom:** Keyboard users tabbing from the top of any page had to step through the entire dispatch bar and header controls because there was no skip link targeting `#main-content`.
  - **Status:** **FIXED** + `f0011c7` (re-verified `a[data-skip-link="true"]` → `#main-content` on `<main id="main-content" tabIndex={-1}>`)

- **BUG-03 — `AIConcierge` dialog missing `aria-modal="true"`, initial focus/Tab trap, crisp exit timing, and had distracting `animate-ping` dot**
  - **Routes / Viewports:** All storefront routes where AB AI opens (`375px` & `1440px`).
  - **Symptom:**
    1. Spring scale transition (`stiffness: 200, damping: 25`) caused the `44px` close button to measure `43×43px` during entrance and delayed `Escape` dismissal beyond `350ms`.
    2. Opening the panel did not move focus inside `#allbarka-concierge-panel` or trap Tab focus while open, and omitted `aria-modal="true"`.
    3. Status dot in panel header still carried `motion-safe:animate-ping`.
  - **Status:** **FIXED** + `f0011c7`, `5beb4ed` (re-verified `aria-modal="true"`, `focusInside=true`, `closeSize=44×44`, `hasPing=false`, `Escape` dismisses cleanly)

### Low

- **BUG-04 — `/faq` page lacked an `<h1>` heading**
  - **Routes / Viewports:** `/faq` (`375px` & `1440px`).
  - **Symptom:** `FAQSection` always rendered `<h2>` for the FAQ title, leaving the standalone `/faq` route with zero `<h1>` elements.
  - **Status:** **FIXED** + `177a37e` (re-verified `/faq` renders `<h1` `"Good questions. Clear answers."`)

- **BUG-05 — Mobile `/shop` search input placeholder clipped mid-word at `375px`**
  - **Routes / Viewports:** `/shop` and `/shop/:category` (`375px`).
  - **Symptom:** Placeholder `"Try badam, pistachios or gift boxes"` clipped as `"Try badam, pis|"` inside the narrow mobile input next to the voice mic button.
  - **Before:** [ai-overlap-375-_shop.png](screenshots/ai-overlap-375-_shop.png)
  - **After:** [qa-bug01-05-fixed-shop-375.png](screenshots/qa-bug01-05-fixed-shop-375.png) (`"Search pantry…"`, fits cleanly with margin)
  - **Status:** **FIXED** + `177a37e`, `5beb4ed` (re-verified visually at `375px`)

- **BUG-06 — Checkout phone input `#checkout-field-phone` missing `inputMode="tel"`**
  - **Routes / Viewports:** `/checkout` (`375px` / `390px`).
  - **Symptom:** `#checkout-field-phone` set `type="tel"` and `autoComplete="shipping tel"` but omitted `inputMode="tel"`.
  - **Status:** **FIXED** + `177a37e` (re-verified `type="tel"`, `inputMode="tel"`, `autoComplete="shipping tel"`)

- **BUG-07 — Directional `ArrowRight` / `ArrowLeft` icons not flipped (`rtl-flip`) in Urdu & Arabic RTL**
  - **Routes / Viewports:** `/product/:id`, `/gifting`, `/checkout`, `/cart`, `/track`, `/journal` (`ur` & `ar` RTL).
  - **Symptom:** Forward/back CTA arrows (`ArrowRight`, `ArrowLeft`) in `GiftsHampersDestination`, `ProductDetailPage`, `CheckoutPage`, `CartPage`, `OrderTrackingPage`, and `JournalPage` lacked `className="rtl-flip"`.
  - **Status:** **FIXED** + `177a37e` (re-verified `unflipped=0` across `/gifting`, `/product/pista`, `/checkout` in RTL)
