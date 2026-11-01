# AllBarka Launch Smoke Procedure (Local & Preview Verification)

This document provides the exact, runnable procedure to verify the entire AllBarka luxury e-commerce application locally before releasing to preview or production.

---

## 1. Prerequisites & Environment Check

Verify Node.js version and repository status:
```bash
node -v        # Must be v20+ or v24+
npm -v
git status     # Ensure clean working tree on codex/admin-catalog-foundation-20261023
```

---

## 2. Core Quality Gates (Automated)

Execute the standard validation pipeline:

### A. TypeScript Typecheck
```bash
npm run typecheck
```
*Expected output: Exit 0, zero type errors (`tsc --noEmit`).*

### B. React Hooks & Architecture Lint
```bash
npm run lint:hooks
```
*Expected output: Exit 0, zero warnings/errors (`eslint src`).*

### C. Build & Release Privacy Audit
```bash
# Windows PowerShell:
$env:ALLBARKA_SKIP_LOCAL_ENV="true"; npm run build

# Linux/macOS:
ALLBARKA_SKIP_LOCAL_ENV="true" npm run build
```
*Expected output: Exit 0, Vite bundle built, server compiled to `build/server.cjs`, and release privacy audit passes with 84+ text artifacts audited clean.*

### D. Full Offline Test Suite (760+ Tests)
```bash
node scripts/run-all-tests.mjs
```
*Expected output: 760+ unit/integration tests PASS, 21 backend checks PASS, 36 production checks PASS.*

---

## 3. Catalog Health & Readiness Audit (M34)

Run the read-only catalog health reporter to verify catalog completeness:
```bash
npx tsx scripts/report-catalog-health.ts
```
*Expected output: Scans 97 products and 3 hamper boxes; clearly tabulates definite failures vs merchant judgment items.*

To export a machine-readable JSON report:
```bash
npx tsx scripts/report-catalog-health.ts --json --output=docs/evidence/catalog-audit/health-report.json
```

---

## 4. Production Server Smoke Verification

Start and test the compiled production server locally:
```bash
node scripts/verify-production.mjs
```
*Expected output: `Production checks: 36 passed.` covering SPA routing, security headers, metadata, robots, and honest fail-closed persistence.*

---

## 5. Manual Browser Journey Checklist (Local Server)

To run the local server interactively:
```bash
node build/server.cjs
```
Open `http://localhost:3000` (or configured PORT) in your browser:

1. **Homepage & Navigation:**
   - Verify emerald signature hero table, navbar, language selector (EN / UR / AR), and dark mode toggle.
   - Verify luxury typography (Playfair Display for headings, Satoshi/Inter for body, Amiri for Urdu/Arabic).
2. **Product Browsing & PDP:**
   - Navigate to `/shop`. Verify 4 items per row on desktop (`lg:grid-cols-4`).
   - Click a product (e.g. `/product/pista`). Verify variant options (`250g`, `500g`, `1kg`), image zoom, and Add to Cart button.
3. **Cart & Sliding Drawer:**
   - Add items to cart. Verify drawer opens smoothly with subtotal, shipping calculation, and minimum order threshold.
4. **Custom Hamper & Gifting Flow:**
   - Navigate to `/gifting`. Open Custom Hamper Builder.
   - Select box packaging (`box-wood`, `box-velvet`, `box-tin`) and 4+ dry fruit selections.
   - Click "Request Hamper Quote". Verify inquiry modal opens without corrupting shopping cart count.
5. **Staff Order Room:**
   - Navigate to `/staff/orders`. Verify customer denial and staff authentication requirement (`noindex` enforced).
6. **Merchant Admin Studio:**
   - Navigate to `/admin/orders`. Verify admin authorization barrier.
