# ALLBARKA LUXURY BOUTIQUE — BATCH 4 HANDOFF & BATCH 5 ROADMAP

**Timestamp:** 2026-09-14  
**Development App URL:** https://ais-dev-cscaeecng72ukas5eqeuqw-709435379155.asia-east1.run.app  
**Shared App URL:** https://ais-pre-cscaeecng72ukas5eqeuqw-709435379155.asia-east1.run.app  

---

## 1. Batch 4 Status Overview (B4-01 through B4-08)

All Batch 4 requirements have been implemented and verified against the Master Blueprint:

- **B4-01 (Themes & Contrast):** Complete semantic CSS variable overhaul. Fixed `--color-cream` dark-mode bug to prevent dark text on dark surfaces. Added `--color-surface-subtle` and synced `colorScheme` in inline head script.
- **B4-02 (Typography & Localization):** Multi-language coverage expanded across English, Urdu (نستعلیق), and Arabic (العربية). Line height adjustments, font declarations, and RTL directional classes (`.rtl-flip`, `.rtl-no-flip`) added.
- **B4-03 (Header & Navigation):** Mobile drawer hierarchy validated (Patron -> Bag -> Language -> Theme -> Collections -> Concierge). Accessibility touch targets (`≥44px`), scroll locking, and focus traps verified.
- **B4-04 (Premium Footer):** Trust assurance strip, 4-column desktop layout, single-accordion mobile view, and Private Reserve newsletter with consent and validation verified.
- **B4-05 (Visual Consistency):** Warm ivory surfaces (`#FFFCF7`), champagne gold accents (`#C7982F`), deep emerald dark accents (`#042821`), and standardized border radii.
- **B4-06 (Scroll Showcase & Motion):** Parallax depth with mouse-tracking on desktop; direct touch scroll on mobile. Drag detection threshold (6px) prevents unintended link firing. Full support for `prefers-reduced-motion: reduce`.
- **B4-07 (Interaction Feedback):** Active scale press states, smooth badge updates, real-time cart subtotal computations, and accessible loading skeletons.
- **B4-08 (Accessibility & Build):** Zero TypeScript compilation or linting errors (`tsc --noEmit` clean). Full WCAG AA color contrast pass.

---

## 2. Changed Files in Batch 4

1. `src/index.css`
   - Added `--color-surface-subtle` and `--color-cream` root and dark definitions.
   - Fixed `--color-cream` dark override from `#1A201E` to `#F6F1EA` to ensure light ivory text/borders remain legible.
   - Added `@media (prefers-reduced-motion: reduce)` global animation and transition suppression rules.
   - Added RTL typography guidelines (line-height 1.75 for Urdu body, 1.4 for headers) and `.rtl-flip` / `.rtl-no-flip` helpers.
2. `index.html`
   - Updated inline head anti-flash theme script to handle `system` preferences and synchronize `document.documentElement.style.colorScheme` immediately.
3. `src/contexts/LanguageContext.tsx`
   - Added comprehensive translation dictionaries for English, Urdu, and Arabic covering search placeholders, bag empty states, free shipping milestones, concierge triggers, and newsletter consent.
4. `src/pages/OrderSuccessPage.tsx`
   - Replaced hardcoded text colors and backgrounds with semantic tokens (`--color-ink`, `--color-ink-muted`, `--color-surface-elevated`).
5. `src/pages/HomePage.tsx`
   - Refactored editorial sourcing and FAQ containers to use semantic variables (`--color-base`, `--color-surface`, `--color-surface-subtle`, `--color-border-accent`).
6. `src/components/AllBarkaHero.tsx`
   - Integrated `useReducedMotion()` from `motion/react` to nullify mouse parallax depth offsets when reduced motion is preferred.
7. `src/components/BackToTop.tsx`
   - Added `prefers-reduced-motion` check to switch between `'smooth'` and `'auto'` scroll behavior.
8. `src/components/Footer.tsx`
   - Audited for semantic contrast, mobile accordion controls, and Private Reserve newsletter consent.
9. `REQUIREMENTS.md`
   - Created full traceability matrix documenting B4-01 through B4-08 criteria, status, and verification evidence.

---

## 3. Theme & Token Corrections

| Token | Light Value | Dark Value | Purpose |
|---|---|---|---|
| `--color-base` | `#F6F1EA` (Warm Cream) | `#121615` (Deep Dark Forest) | Root canvas background |
| `--color-surface` | `#FFFCF7` (Raised Ivory) | `#1A201E` (Warm Dark Charcoal) | Primary cards, panels, and modals |
| `--color-surface-elevated` | `#FFFFFF` (Pure White) | `#222A28` (Elevated Charcoal) | Floating dropdowns, inputs, popovers |
| `--color-surface-subtle` | `#FAF9F5` (Subtle Tint) | `#1E2523` (Subtle Charcoal) | Secondary pill tags, well containers |
| `--color-gold` | `#C7982F` (Champagne Gold) | `#D4A843` (Luminous Gold) | Accent details, active states, borders |
| `--color-ink` | `#29231D` (Warm Charcoal) | `#F6F1EA` (Soft Ivory White) | Primary high-contrast typography |
| `--color-ink-muted` | `#635B52` (Muted Warm Bronze) | `#B4C0BC` (Cool Pale Sage) | Subheadings, descriptions, metadata |
| `--color-cream` | `#F6F1EA` | `#F6F1EA` | Always represents true ivory/cream tone |

---

## 4. Translation Coverage & Remaining Gaps

- **Fully Covered:**
  - Navigation links, hero search prompts, and rotating search placeholders.
  - Cart drawer empty state, item counter, subtotal, and free shipping progress (`Rs. 3,000`).
  - Checkout steps (Information, Shipping, Payment), delivery slots (Morning, Afternoon, Evening), payment options (COD, Bank Transfer).
  - Order success confirmation messages, WhatsApp concierge inquiry links.
  - Newsletter consent agreements, privacy transparency notice, and footer legal links.
- **Edge-Case Gaps to Polish in Batch 5:**
  - Individual deep article body text in `JournalPage.tsx` (articles are currently bilingual in English with Urdu summary callouts).
  - Certain long legal policy paragraphs in `PoliciesPage.tsx` (concierge summary bullets are translated; complete full-length legal policy texts can be enriched).

---

## 5. Mobile & Desktop Motion Behavior

- **Desktop Experience:**
  - Mouse-tracking parallax across the Hero flatlay display with spring damping.
  - Category and product horizontal carousels support click-and-drag mouse scrubbing with a 6px intentional drag threshold to protect click handlers.
  - Subtle button hover scaling and smooth drawer overlays.
- **Mobile Experience:**
  - Pure native momentum touch-scrolling without scroll-jacking or forced pinning.
  - Quick-view modals and mobile menu slide smoothly via spring physics.
  - Back-to-top button positions above safe area insets and fixed cart bars.
- **Reduced Motion Fallback:**
  - `@media (prefers-reduced-motion: reduce)` nullifies transitions and CSS animations.
  - `useReducedMotion()` in `AllBarkaHero.tsx` locks parallax translations to `[0, 0]`.
  - `BackToTop.tsx` switches `window.scrollTo` from `'smooth'` to `'auto'`.

---

## 6. Verification Commands & Results

- **Linter Check:** `npm run lint` (`tsc --noEmit`) -> **0 errors, 0 warnings**.
- **Compilation Check:** `compile_applet` -> **Build succeeded - the applet is compiled**.
- **Dev Server:** Port 3000 running smoothly with Express API endpoints and Vite SPA middleware.

---

## 7. Next Actions for Batch 5 (Production Hardening & Launch)

1. **SEO & Social Share Cards:** Verify OpenGraph tags, dynamic product metadata, and structured JSON-LD schema (Product, Organization, LocalBusiness).
2. **PWA & Offline Resilience:** Verify service worker registration, web app manifest icons, and local cart caching.
3. **End-to-End Edge Case Testing:** Run full simulation of order placement with discounts, custom hampers, and WhatsApp dispatch across mobile screen sizes.
4. **Final Performance Audit:** Verify image lazy loading, WebP compression, and font display swap settings.
