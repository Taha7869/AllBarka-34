# Handoff — `ag/20261122-premium-home` (Phase 1: Plan, Samples & Hero Prototype)

- **Date:** 22 November 2026 (Asia/Karachi)
- **Author:** Antigravity
- **Branch:** `ag/20261122-premium-home` (cut from `origin/claude/celebrations-foundation-20261112` at `4a46825`)
- **Deploy branch untouched:** `claude/celebrations-foundation-20261112` was NOT modified or pushed.
- **Live Home untouched:** `src/pages/HomePage.tsx` has **0 edits**; prototype lives solely at `/preview/premium-home`.
- **Phase 1 Status:** **COMPLETE & STOPPED** pending owner/Claude visual review before Phase 2 implementation.

## Deliverables

1. **Step A & B — Audit + Design Plan:** [docs/design/premium-home-plan.md](../design/premium-home-plan.md)
   - Full 11-block audit of current `HomePage.tsx` + conversion values + proposed 6-section calm architecture (7 incl. Footer) relocating all moved tools to `/shop`, `/gifting`, `/occasions`, and `/faq` (zero features deleted).
   - Git history photo audit of 6 reference shots (`9474325`, `d7d9165`, `9236838`, `4a6db50`) documenting lighting, travertine surfaces, emerald linen, angles, props, and crops.
   - 6 named brand hex tokens derived from `src/index.css` (`#042821`, `#1E3A2B`, `#FDFBF7`, `#F2ECE2`, `#C7982F`, `#29231D`), typography scale (`Playfair Display`, `Inter`, `Noto Nastaliq Urdu`, `Amiri`), desktop (1440px) & mobile (390px) ASCII wireframes, and ONE Hero-only signature motion spec (`prefers-reduced-motion` static, mobile LCP `< 2.5s`).

2. **Step C — 6 Branded Packaging Samples + Montage:**
   - Official logo referenced directly from `public/images/allbarka_full_logo_1786931029101.jpg` (walnut + laurel wreath + intertwined `AB` monogram + crisp `AllBarka` serif wordmark; zero garbled text, zero unverified dates).
   - 6 optimized WebP samples in `public/images/drafts-premium-20261122/`:
     - `01-hero-gift-box-dates.webp` (1600×900, 70 KB)
     - `02-saffron-jar-closeup.webp` (1200×1200, 127 KB)
     - `03-honey-bottle.webp` (1200×1200, 134 KB)
     - `04-dry-fruit-hamper-top.webp` (1200×1200, 229 KB)
     - `05-kalmi-dates-macro.webp` (1200×900, 105 KB)
     - `06-eid-gift-box-card-ribbon.webp` (1200×900, 94 KB)
   - Contact-sheet montage: [docs/design/premium-samples-montage.jpg](../design/premium-samples-montage.jpg)

3. **Step D — Isolated Hero Prototype (`/preview/premium-home`):**
   - `src/components/PremiumHeroPrototype.tsx` + `src/pages/PremiumHomePreviewPage.tsx` (lazy-loaded in `src/App.tsx`, `noindex={true}`, breadcrumbs hidden cleanly on `/preview/premium-home`).
   - ONE signature orchestrated motion: embossed AllBarka gold crest seal presses then rigid matte emerald lid lifts once (~1.1s) to unveil the open dates & dry-fruit box; completely static under `prefers-reduced-motion: reduce`; quiet 44×44 replay control for review.
   - Full EN / UR (RTL) / AR (RTL), visible keyboard focus rings, area-level Lahore provenance only, zero health claims.
   - Screenshots captured via headless Chromium on production `dist/`:
     - Desktop (1440×900): [docs/design/hero-desktop.png](../design/hero-desktop.png)
     - Mobile (390×844): [docs/design/hero-mobile.png](../design/hero-mobile.png)

## Verification Evidence

- **`npm run typecheck` (`tsc --noEmit`):** 0 errors
- **`npm run lint:hooks` (`eslint src`):** 0 errors (3 pre-existing warnings in unrelated files)
- **`npm run build`:** PASS — `PremiumHomePreviewPage` code-split (`4.45 kB` gzipped), `Release privacy audit passed (125 text artifacts; no private values printed).`
- **Chromium preview checks (`1440×900` + `390×844`, EN/UR/AR, `prefers-reduced-motion: reduce`):**
  - Desktop & Mobile EN/UR/AR overflow = `0`
  - UR & AR `dir="rtl"` verified
  - `prefers-reduced-motion: reduce` renders `data-reveal-phase="open"` with `0` lid overlay nodes
- **Targeted unit test (`tests/premium-home-preview.test.tsx`):** `# pass 3 / # fail 0`
- **Full test suite (`ALLBARKA_SKIP_LOCAL_ENV=true node scripts/run-all-tests.mjs`):**
  - `ℹ tests 1012` · `ℹ pass 1010` · `ℹ fail 1` · `ℹ skipped 1`
  - Sole failure is the known Windows-only POSIX `SIGTERM` exit check in `tests/dev-server.test.mjs:54` (`'SIGTERM' !== null`; all HTTP/CSP/SPA checks pass; Linux CI exits cleanly). **0 application failures.**

## Next Action (Phase 2 — Awaiting Owner Approval)

Owner & Claude review `docs/design/premium-home-plan.md`, `docs/design/premium-samples-montage.jpg`, and `docs/design/hero-desktop.png` / `hero-mobile.png` (plus live `/preview/premium-home`). Proceed to Phase 2 (migrating the 6-section architecture onto live Home and relocating moved sections to `/gifting`, `/occasions`, and `/shop`) only after explicit owner sign-off.
