# AllBarka Renovation — Stage 1 Handoff & Review Packet

**Document Version:** 2.0.0  
**Date:** October 17, 2026  
**Baseline Git Commit:** `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`  
**Active Feature Branch:** `feat/renovation-v2`  
**Parent / Production Branch:** `launch` (in sync with `origin/launch` and `origin/main`)  
**Status:** **STAGE 1 COMPLETE — HALTED AT ACCEPTANCE GATE**

---

## 1. Executive Summary

Stage 1 of the AllBarka Renovation Plan (version 2.0) has been executed strictly within the analytical and documentation boundaries defined in `AllBarka_Antigravity_Master_Prompt (1).md`. 

No production data has been altered. No code changes have been committed to `main` or `launch`. All analysis, auditing, taxonomy mapping, and architecture planning have been completed on a dedicated feature branch (`feat/renovation-v2`) created directly from the authoritative production baseline commit `8cf4410`.

---

## 2. Baseline Verification Evidence

Before formulating the architecture and migration specifications, the repository was verified for baseline health:
1. **Branch Alignment:**
   - `main`: `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`
   - `launch`: `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`
   - `origin/main`: `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`
   - `origin/launch`: `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`
   - Feature branch created and checked out: `feat/renovation-v2`.
2. **TypeScript Compilation:**
   - Command: `npm run typecheck` (`tsc --noEmit`)
   - Result: Exited with code 0 (zero errors across 100+ files).
3. **Integration Test Suite:**
   - Command: `npm run test:integrations`
   - Result: 58/58 tests passed (0 failures, duration 31.1s).
4. **Inquiry & Catalog Sync Security Tests:**
   - Command: `node --import tsx --test --test-isolation=none tests/inquiry-and-sync-security.test.ts`
   - Result: 4/4 tests passed (0 failures, duration 1.2s).

---

## 3. Confirmed Business Rules Applied to Architecture

All business rules defined in Section D of the Master Prompt have been formally recorded and incorporated into the requirement specifications without requiring user re-confirmation:

- **Rule D1 (Packaging Minimum Order Quantity - MOQ):**
  - Formula: `min(25, max(1, ceil(5000 / publishedPerPiecePrice)))` with admin override.
  - Test vectors verified:
    - Rs. 100/pc -> MOQ = 25 pcs (Pack total: Rs. 2,500)
    - Rs. 300/pc -> MOQ = 17 pcs (Pack total: Rs. 5,100)
    - Rs. 500/pc -> MOQ = 10 pcs (Pack total: Rs. 5,000)
    - Rs. 1,000/pc -> MOQ = 5 pcs (Pack total: Rs. 5,000)
    - Rs. 6,000/pc -> MOQ = 1 pc (Pack total: Rs. 6,000)
  - Isolated across designs (no cross-design pooling).
  - Strictly excluded for food and dry fruit products.
- **Rule D2 (Initial Import Markup):**
  - Formula: `sellingPrice = referencePrice * 1.05` applied once upon initial import.
  - Recorded separately; admin manual edits are authoritative and final.
- **Rule D3 (Custom Order Preparation Lead Time):**
  - Minimum 10 calendar days lead time for custom packaging and personalized orders.
  - Enforced in checkout date picker and order confirmation notes.
- **Rule D4 (Dual Order Mode):**
  - Standard priced items proceed through direct checkout.
  - Unpriced or custom bulk configurations route to `CustomQuoteModal` and the Admin Bargain Desk.
- **Rule D5 (Boutique Selections Autoplay):**
  - 3 admin-selected products per category tab (21 products total across 7 tabs).
  - Default category: Dry Fruits (`dry-fruits`).
  - Autoplay cycle interval: 6,000ms.
  - Pause behavior: Pause on pointer hover for the full duration of hover; wait 3,000ms after mouseleave before resuming. Pause immediately on keyboard focus, touch swipe, or user interaction.
  - Accessibility: Dedicated Play/Pause toggle control; disabled by default when `prefers-reduced-motion` is detected.
- **Rule D6 (Admin Merchandising Settings):**
  - Firestore collection `merchandising/settings` stores featured IDs and category assignments.
  - Admin preview mode before publishing; no duplicate cards or artificial badges.

---

## 4. Summary of Stage 1 Documentation Deliverables

1. [`docs/RENOVATION_REQUIREMENTS.md`](file:///C:/Users/taha/.gemini/antigravity/scratch/AllBarka-34/docs/RENOVATION_REQUIREMENTS.md):
   - Full Requirements Traceability Matrix covering 46 granular requirements across 8 functional areas (`CAT`, `PKG`, `NAV`, `HOME`, `CHK`, `ADM`, `N8N`, `QA`).
2. [`docs/RENOVATION_PLAN.md`](file:///C:/Users/taha/.gemini/antigravity/scratch/AllBarka-34/docs/RENOVATION_PLAN.md):
   - Evidence-based audit of all existing storefront components, backend routes, and database models.
   - Target architecture flowchart.
   - Comprehensive category migration mapping (7 canonical categories with slug aliases).
   - Complete 97-product reclassification table.
   - Detailed specification for 22 new packaging products to achieve >= 6 products per subcategory (30+ total).
   - Component reuse / modify / replace / delete matrix.
   - 8-stage execution roadmap with risks and mitigations.
3. [`docs/RENOVATION_HANDOFF.md`](file:///C:/Users/taha/.gemini/antigravity/scratch/AllBarka-34/docs/RENOVATION_HANDOFF.md):
   - This document — providing executive review, verification evidence, and the Stage 2 entry checklist.

---

## 5. Stage 2 Entry Criteria Checklist

| Check | Item | Status |
| :---: | :--- | :---: |
| 1 | Baseline commit confirmed on `main` and `launch` (`8cf4410`) | **PASS** |
| 2 | Working feature branch created (`feat/renovation-v2`) | **PASS** |
| 3 | Baseline typecheck clean (`tsc --noEmit` exit 0) | **PASS** |
| 4 | Baseline integration tests passing (58/58 passed) | **PASS** |
| 5 | Baseline inquiry & catalog sync tests passing (4/4 passed) | **PASS** |
| 6 | Requirements Traceability Matrix generated (`RENOVATION_REQUIREMENTS.md`) | **PASS** |
| 7 | Renovation Plan & Migration Mapping generated (`RENOVATION_PLAN.md`) | **PASS** |
| 8 | Stage 1 Handoff generated (`RENOVATION_HANDOFF.md`) | **PASS** |
| 9 | **Explicit User Review & Authorization to Begin Stage 2** | **PENDING USER APPROVAL** |

---

## 6. Next Steps Upon User Authorization (Stage 2: Canonical Taxonomy & Catalog Foundation)

When user authorization is received, Stage 2 will proceed with:
1. Updating `src/config/categories.ts` with the 7 canonical categories and legacy alias mapping.
2. Reclassifying all 97 existing products in `src/data/products.ts` into the 7 canonical categories.
3. Extracting Dates into its own dedicated category with Pakistan-available harvest reserves.
4. Hardening `catalogStore.ts` so dynamic Firestore products merge cleanly without resurrecting inactive items.
5. Updating `CategoryPLP.tsx` category navigation pills and filter drawer.
6. Writing unit and regression tests for category resolution and catalog merging.

**STOPPING POINT:** Awaiting user sign-off on the Stage 1 review packet before proceeding.
