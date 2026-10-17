# AllBarka Renovation — Stage 1 Handoff & Review Packet v2.1

**Document Version:** 2.1.0  
**Date:** October 17, 2026  
**Baseline Git Commit:** `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`  
**Active Working Branch:** `feat/renovation-v2`  
**Parent / Production Branch:** `launch` (synced with `origin/launch` and `origin/main`)  
**Applicable Instructions Read:** `C:\Users\taha\.gemini\antigravity\scratch\AllBarka-34\AGENTS.md` and `C:\Users\taha\.gemini\config\plugins\science\rules\AGENTS.md`  
**Status:** **STAGE 1 REVISED & HALTED AT ACCEPTANCE GATE**

---

## 1. Executive Summary

Stage 1 of the AllBarka Renovation Plan (version 2.0) has been comprehensively audited and revised to restore strict fidelity to the approved Master Prompt. 

All documentation has been updated to reflect:
1. The original **eight-stage implementation sequence** (including Stage 6 Customization Inquiries and Stage 7 AllBarka Gifting Buddy, with Stage 8 halting before merge, deployment, or production database writes).
2. The approved **two-level information architecture** (Main row: `Shop | Gifts & Hampers | Celebration Boxes | Occasions | Deals`; Food row: `Dry Fruits & Nuts | Dates | Seeds & Snacks | Oils | Desi Essentials | Herbs & Spices`), strictly avoiding unapproved merged categories like `oils-honey` or `seeds-nuts` and keeping honey/ghee/panjeeri in Desi Essentials.
3. The **Stage 2 Dynamic Product Management Gate** requiring admin creation of products absent from compiled source code that function end-to-end through public catalog, discovery, PDP, cart, orders, and AI context.
4. **Evidence-based product expansion** classifying items as `VERIFIED`, `OWNER-CONFIRMED`, or `PROPOSED` with verified source citations, avoiding invented rates or specifications, and incorporating *Personalized Treats & Wrappers*.
5. Strict adherence to confirmed commercial rules (**D1** MOQ formula without cross-design pooling; **D2** 5% initial import markup without re-import compounding; **D3** 10 calendar days preparation lead time; **D4** dual order mode without artificial bulk percentage discounts).
6. Honest documentation of baseline test limitations and observed backend gaps.

---

## 2. Baseline Verification Evidence

| Command / Suite | Actual Output / Result | Exit Code | Evaluation & Coverage Notes |
| :--- | :--- | :---: | :--- |
| `npm run typecheck` (`tsc --noEmit`) | Output: `allbarka@0.0.0 typecheck` (zero diagnostics emitted across the entire project). | `0` | **VERIFIED:** Codebase compiles cleanly with zero TypeScript errors on baseline. |
| `npm run test:integrations` | Output: 58 tests passed, 0 failed, duration 31.1s. Includes order updates, Sheet status sync, WhatsApp idempotency, and auth guards. | `0` | **VERIFIED:** Core backend commerce router, auth middleware, and Sheet synchronization are functionally intact. |
| `tests/inquiry-and-sync-security.test.ts` | Output: 4 tests passed, 0 failed, duration 1.2s. | `0` | **EVALUATION CAVEAT:** These tests evaluate an in-memory Express router recreation and sanitization helper. They verify logic in isolation, but **do not** prove production route wiring in `server.ts`. |

### Observed Backend Gaps (Scheduled for Stage 2, 3, and 6 Fixes)
1. **`persistInquiryRecord` In-Memory Fallback:** In `server.ts`, if Firestore is unconfigured or unreachable, inquiry submissions fall back to an in-memory array and return HTTP 200. This creates a false claim of durable receipt. Must be addressed in Stage 6 to preserve the customer's draft and offer retry or an explicit unsaved WhatsApp handoff.
2. **`wa-products` Compiled Fallback:** `/api/integrations/n8n/wa-products` falls back to static `PRODUCTS` if dynamic catalog loading fails, potentially serving stale pricing or resurrecting inactive items. Must return 503 during catalog outage (Stage 3).
3. **`mergeAuthoritativeCatalog` Loader Coverage:** While `mergeAuthoritativeCatalog` supports dynamic Firestore inputs, storefront transaction loaders and frontend `CatalogContext.tsx` still need end-to-end verification to guarantee inactive items are never revived (Stage 2).
4. **Navigation Breakpoint Behavior:** In `src/layouts/RootLayout.tsx`, desktop navigation is hidden at `xl` (`hidden xl:flex`), meaning viewports between 1024px and 1279px (`lg`) rely on the mobile menu drawer icon. This functioning mobile fallback will be tested and refined in Stage 4 rather than treated as an active regression.

---

## 3. Revised Documentation Deliverables

The following three documentation artifacts have been revised on `feat/renovation-v2`:

1. [`docs/RENOVATION_REQUIREMENTS.md`](file:///C:/Users/taha/.gemini/antigravity/scratch/AllBarka-34/docs/RENOVATION_REQUIREMENTS.md):
   - Full Requirements Traceability Matrix covering 42 requirements strictly organized by the original 8 stages (`REQ-S1-xxx` through `REQ-S8-xxx`).
   - Every requirement maps to source, implementation paths, and acceptance verification criteria.
2. [`docs/RENOVATION_PLAN.md`](file:///C:/Users/taha/.gemini/antigravity/scratch/AllBarka-34/docs/RENOVATION_PLAN.md):
   - Detailed audit findings and target architecture.
   - 7 canonical collections and 6 canonical food categories with explicit legacy slug splitting strategy.
   - Complete 97-product reclassification table.
   - Evidence-based packaging catalog expansion table (30 products classified as `VERIFIED` or `PROPOSED` with supplier source citations).
   - Component action matrix (reuse, modify, create).
   - 8-stage sequence with explicit acceptance gates.
   - Comprehensive risk register.
3. [`docs/RENOVATION_HANDOFF.md`](file:///C:/Users/taha/.gemini/antigravity/scratch/AllBarka-34/docs/RENOVATION_HANDOFF.md):
   - This handoff packet and review evidence.

---

## 4. Git Commit History & Diff Summary

- **Baseline Commit:** `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`
- **Initial Docs Commit:** `d6078cf` (`docs: complete Stage 1 architecture audit, requirements matrix, and renovation plan v2.0`)
- **Revised Docs Commit:** (To be recorded upon committing these revised files)

```
docs/RENOVATION_HANDOFF.md      | ~130 insertions, updates to 8-stage mapping & gap register
docs/RENOVATION_PLAN.md         | ~360 insertions, restored 6 food categories, evidence table, Stage 2 CRUD gate
docs/RENOVATION_REQUIREMENTS.md | ~140 insertions, REQ-S1 through REQ-S8 granular matrix
3 files changed
```

---

## 5. Stage 2 Entry Criteria Checklist

| Check | Item | Status |
| :---: | :--- | :---: |
| 1 | Baseline commit confirmed on `main` and `launch` (`8cf4410`) | **PASS** |
| 2 | Working feature branch active (`feat/renovation-v2`) | **PASS** |
| 3 | Baseline typecheck clean (`npm run typecheck` exited 0) | **PASS** |
| 4 | Baseline integration tests passing (58/58 passed) | **PASS** |
| 5 | Baseline inquiry & catalog sync tests passing (4/4 passed) with documented coverage caveats | **PASS** |
| 6 | Applicable `AGENTS.md` instructions read and confirmed | **PASS** |
| 7 | Revised Requirements Traceability Matrix generated (`RENOVATION_REQUIREMENTS.md`) | **PASS** |
| 8 | Revised Renovation Plan & Migration Mapping generated (`RENOVATION_PLAN.md`) | **PASS** |
| 9 | Revised Stage 1 Handoff generated (`RENOVATION_HANDOFF.md`) | **PASS** |
| 10 | **Explicit User Review & Authorization to Begin Stage 2** | **PENDING USER APPROVAL** |

---

## 6. Next Steps Upon Explicit User Authorization (Stage 2: Data Model, Complete Admin CRUD and Safe Migrations)

When user authorization is received, Stage 2 will proceed with:
1. Defining the canonical taxonomy and collection data model in `src/types/index.ts` and `src/config/categories.ts`.
2. Auditing all code assuming a compiled `PRODUCTS` list, including transaction loaders in `catalogStore.ts`.
3. Implementing dynamic product CRUD in `AdminCatalogPanel.tsx` and `server.ts` (create, edit, duplicate-as-draft, publish, archive, images, MOQ override, lead time).
4. Enforcing server-side authorization with trusted admin claims and stale-edit conflict protection.
5. Verifying the **Stage 2 Acceptance Gate**: creating a product absent from compiled source code via admin and proving its functionality across public catalog, discovery, PDP, cart, orders, and AI context.

**STOPPING POINT:** Execution is stopped here. Awaiting explicit user sign-off on the revised Stage 1 packet before beginning Stage 2.
