AllBarka Project Rules (all AI agents MUST follow)
Stack
Vite + React 18 + TypeScript + Tailwind CSS (SPA, React Router)
Express server (server.ts) — Node 22, Firebase Admin SDK
Firebase Firestore + Auth, Motion (framer-motion) for animation
Architecture (Multipage SPA — React Router)
Routes:

/ -> HomePage
/shop, /shop/:category, /category/:category -> ShopPage
/wholesale -> ShopPage (wholesale filter active)
/gifting -> ShopPage (gifting/combos filter active)
/product/:id -> ProductDetailPage
/checkout -> CheckoutPage (3-step luxury checkout)
/success -> OrderSuccessPage (reload reads persisted session order)
/cart -> CartPage
/pages/:slug, /story, /contact -> InfoPage
/policies/:slug, /policies -> PoliciesPage
/journal -> JournalPage
/faq -> FAQPage
-> NotFoundPage (graceful 404 recovery)
Design System (source of truth = actual code tokens)
Colors: emerald #1E3A2B, gold #C7982F, ivory #FDFBF7, base cream #F6F1EA, surface #FFFCF7, ink #29231D, bronze #806326
Fonts: Playfair Display (headings), Inter (body), Amiri (Urdu/Arabic RTL)
Aesthetic: luxury boutique (Harrods-level), restrained, NO cheap effects
WCAG AA minimum 4.5:1 contrast for body copy
Dark mode must ALWAYS keep working
Respect prefers-reduced-motion in every animation
Business Rules (DO NOT CHANGE without explicit instruction)
Lahore standard shipping Rs.150; FREE when discounted subtotal >= Rs.3,000.
Outside Lahore all delivery methods use actual canonical order weight x Rs.250/kg, minimum Rs.250. Never grant free delivery outside Lahore. Do not round up to whole kilograms (1.2kg = Rs.300).
Oil billing convention: 1ml counts as 1g for the delivery tariff, as confirmed by the owner; this is not a physical density assertion.
Lahore express shipping Rs.350 (priority courier).
Server strictly recalculates prices, coupons (e.g. ALLBARKA10 = 10%), and shipping
Reviews: neighborhood tags only (DHA Phase 6, Gulberg III, Model Town), no relative dates
Languages: English, Urdu (RTL), Arabic (RTL) via LanguageContext
Hard Rules
Before creating ANY component, read docs/COMPONENTS_INVENTORY.md — reuse existing, don't duplicate
All new components: TypeScript + Tailwind, placed in src/components
NEVER modify server-side pricing logic in server.ts without explicit instruction
NEVER hardcode secrets — env vars only
After every change: run npm run build and fix errors until it passes
Keep LanguageContext working — all user-facing text via t() calls
Mobile-first responsive; touch targets minimum 44px
List any new npm dependency + why before installing
Do not delete or rename files outside the scope of the current task
