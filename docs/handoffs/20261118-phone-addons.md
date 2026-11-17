# Handoff: International Checkout Phone + Dynamic Paid Add-ons

**Date:** 18 November 2026 (Asia/Karachi)  
**Agent:** Antigravity (PC)  
**Branch:** `ag/20261118-phone-addons`  
**Base commit:** `bee07e7` (`origin/claude/celebrations-foundation-20261112`)

---

## 1. What Was Completed (2 Commits)

### Commit A: International Customer Phone + Required Pakistani Delivery Phone
- **Shared Phone Rules (`src/lib/phoneRules.ts`):**
  - `normalizeContactPhone(raw)`: Accepts both Pakistani mobiles (`03XXXXXXXXX` / `+923XXXXXXXXX`) and international E.164 numbers from any country (`+` or `00` prefix with 8–15 digits).
  - `resolveCheckoutPhones(rawPhone, rawDeliveryPhone)`: When the customer's contact number is Pakistani, `deliveryPhone` defaults to `phone` (or validates an optional second Pakistani mobile). When the customer's contact number is outside Pakistan (`needsPakistaniDeliveryPhone`), a Pakistani delivery number (`03XXXXXXXXX`) is strictly required (`DELIVERY_PHONE_REQUIRED` / `INVALID_DELIVERY_PHONE`).
- **Checkout Client & Server Parity:**
  - `CheckoutPage.tsx` automatically shows the required **"Pakistan mein delivery ka number"** (`checkout.deliveryPhoneLabel`) field whenever a non-Pakistani contact number is entered, with EN/UR/AR labels, hints, and error messages.
  - `validateCustomerDetails` (`src/lib/orderValidation.ts`) and `createDurableOrder` (`src/lib/orderDatabase.ts`) enforce the rule server-side and persist `customer.deliveryPhone`.
  - **Bulk Gifting (`src/lib/bulkGifting.ts`):** `validateBulkRecipient` strictly requires every recipient's number to be a Pakistani mobile (`03XXXXXXXXX`).
- **Admin, Packing Sheet, Staff, Tracking & WhatsApp Visibility:**
  - `generateAuthoritativeWhatsAppMessage` (`src/lib/serverOrderService.ts`) and fallback receipt (`server.ts`) include `Delivery Phone (Pakistan): 03XXXXXXXXX` distinctly alongside `Contact: ...`.
  - `AdminOrdersPage.tsx` (Admin Order Detail & Packing Sheet) and `StaffOrdersWorkspace.tsx` display `deliveryPhone` separately and allow searching orders by either `phone` or `deliveryPhone`.
  - `/api/orders/track` and `/api/orders/reorder-items` accept the last 4 digits of either `customer.phone` or `customer.deliveryPhone`.
  - `projectCanonicalOrderForN8n` (`src/services/n8nOrderNotification.ts`) keeps `customer.phone` as the Pakistani courier number (`03XXXXXXXXX`) and passes `customer.contactPhone` when different.

### Commit B: Dynamic Paid Add-ons (Catalog, Matching, Server Pricing & Admin Panel)
- **Add-on Catalog & 5 Starter Drafts (`src/lib/addonsCatalog.ts`):**
  - Seeded 5 starter add-ons in `STARTER_ADDONS` with `price: 0` and `active: false` (inactive drafts until the owner sets prices):
    1. `printed-card` — Printed Message Card / پرنٹڈ پیغام کارڈ / بطاقة رسالة مطبوعة (`fixed`, `gift/eid/nikah`)
    2. `eidi-lifafa` — Eidi Lifafa (Envelope) / عیدی لفافہ / ظرف عيدي فاخر (`per_item`, `eid/gift/nikah`)
    3. `naam-sleeve` — Custom Name Sleeve / نام والی سلیو / غلاف باسم مخصص (`per_item`, `Gift Boxes / Celebration Bundles / Packaging`, `gift/nikah/eid`)
    4. `glass-jar-upgrade` — Glass Jar Upgrade / شیشے کے جار میں اپ گریڈ / ترقية إلى برطمان زجاجي (`per_item`, `Nuts / Dry Fruits / Dates / Seeds`)
    5. `wooden-tray` — Handcrafted Wooden Tray / لکڑی کی ٹرے / صينية خشبية فاخرة (`fixed`, `minOrderValue: 3000`, `gift/nikah/eid`)
- **Relevance Matching (`matchAddonsForCart`):**
  - Matches active add-ons (`active: true`, resolved price > 0) against cart products, categories, occasion (`gift`, `eid`, `nikah`), and `minOrderValue`/`maxOrderValue`.
  - Ranks by relevance score (direct product match > occasion match > category match > order value tier) and returns **at most 4** (`MAX_VISIBLE_ADDONS = 4`).
- **Authoritative Server-Side Pricing (`validateAndPriceAddons` & `validateAndPriceOrder`):**
  - Supports `fixed` (per order) and `per_item` (per matching item quantity) pricing modes plus per-product price overrides (`productPriceOverrides`).
  - Completely ignores any client-submitted add-on prices; computes `addonsFee` on the server, adds it to `totals.total`, and records `order.addons` in the saved order, Admin Order View, Packing Sheet, and WhatsApp confirmation message.
- **Firestore API & Admin Panel (`src/lib/addonsRouter.ts`, `src/components/AdminAddonsPanel.tsx`):**
  - `GET /api/catalog/addons` (public active add-ons) and `GET/PUT /api/admin/catalog/addons` (admin optimistic-concurrency editor stored at `catalogSettings/addons` with audit trail in `catalogAudits`).
  - Added **Paid Add-ons** tab (`?view=addons`) in `AdminOrdersPage.tsx` and mounted `PaidAddonsSelector` in `CartDrawer.tsx`, `CartPage.tsx`, and `CheckoutPage.tsx`.

---

## 2. Verification Evidence

- `tests/checkout-international-phone.test.ts`: **4 pass, 0 fail** (`# pass 4 / # fail 0`)
- `tests/paid-addons.test.ts`: **5 pass, 0 fail** (`# pass 5 / # fail 0`)
- `tests/checkout-validation-hardening.test.ts` + `tests/bulk-gifting.test.ts`: **10 pass, 0 fail** (`# pass 10 / # fail 0`)
- `tests/admin-expansion-browser.test.tsx` + `tests/premium-detail-browser.test.tsx`: **2 pass, 0 fail** (`# pass 2 / # fail 0`, zero console/404 errors)
- `tests/stage6-operational-integration.test.ts`: **2 pass, 0 fail** (`# pass 2 / # fail 0`, `vite.config.ts` respects `ALLBARKA_SKIP_LOCAL_ENV=true` via `envDir: false`)
- Backend suite (`node --import tsx tests/run-backend-tests.mjs`): **21 PASSED, 0 FAILED**
- Catalog asset check (`node --import tsx scripts/verify-catalog-assets.ts`): **97 products, 115 image references, 0 missing files**
- `npm run typecheck`: **PASS** (`tsc --noEmit` exited with code 0)
- `npm run build`: **PASS** (Vite build + esbuild server bundle + Release privacy audit of 88 artifacts passed with zero private values printed)

---

## 3. Next Actions for Claude & Owner

1. Claude reviews and merges `ag/20261118-phone-addons` into `claude/celebrations-foundation-20261112`.
2. When ready to launch paid add-ons, open Admin -> **Paid Add-ons** (`?view=addons`), enter PKR prices for any of the 5 starter add-ons, toggle **Active on storefront**, and click **Save add-ons**.
