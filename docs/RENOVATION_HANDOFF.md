# AllBarka Renovation — Stage 2 Code Review Repairs Handoff & Review Packet v2.7

**Document Version:** 2.7.0  
**Date:** October 17, 2026  
**Baseline Git Commit:** `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`  
**Active Working Branch:** `feat/renovation-v2` (Pushed & tracking `origin/feat/renovation-v2`)  
**Parent / Production Branch:** `launch` (synced with `origin/launch` and `origin/main`)  
**Applicable Instructions Read:** `C:\Users\taha\.gemini\antigravity\scratch\AllBarka-34\AGENTS.md` and `C:\Users\taha\.gemini\config\plugins\science\rules\AGENTS.md`  
**Status:** **STAGE 2 COMPLETED & VERIFIED — HALTED AT ACCEPTANCE GATE**

---

## 1. Executive Summary & Stage 2 Repairs Completed

In response to the latest Stage 2 review on commit `9e20cf2`, all remaining concurrency, durable journal, transaction safety, and rollback protection defects have been resolved and verified with 20/20 passing tests in the Stage 2 acceptance suite:

### 1. End-to-End Merchandising Concurrency Protection (Test 13)
- **Strict Revision Token Enforcement**:
  - `publishAdminMerchandisingClient` and `AdminMerchandisingPanel.handlePublish` strictly send `{ expectedDraftRevision, expectedLiveRevision }`.
  - Backend route `/api/admin/merchandising/publish` and `publishAdminMerchandising` in `catalogStore.ts` strictly validate both tokens as valid non-negative integers. Missing, null, negative, or non-integer tokens are rejected with HTTP 409 `CATALOG_REVISION_CONFLICT`.
  - `GET /api/admin/merchandising` returns the complete bundle: `{ settings, draft, live, draftRevision, liveRevision }`.
- **UI Draft Synchronization**:
  - Upon successful publication, `AdminMerchandisingPanel` synchronizes local state with the resulting `draftRevision` (and does not treat `liveRevision` as `draftRevision`).
- **Unsaved Draft Edits Protection**:
  - `AdminMerchandisingPanel` detects unsaved local draft modifications via canonical snapshot comparison (`hasUnsavedChanges`). When unsaved edits exist, an amber warning pill is rendered, the Publish button is disabled, and attempts to publish are blocked with an explicit error message prompting the admin to save first.
- **Real Route & Client Verification**:
  - Verified via real Express HTTP server: missing tokens rejected (409), stale tokens rejected (409), competing two-admin publication (exactly one 200, one 409), and save-after-publish journey verifying that saving with the old draft revision fails with 409 while saving with the resulting draft revision succeeds (200).

### 2. Durable Migration Recovery & Atomic Persistence (Test 14 / Regression Test A)
- **Atomic Mutation & Journal Persistence**:
  - In `src/lib/catalogMigrationV2.ts`, each product mutation and its recovery record (before-image, post-revision, executed item ID) are written atomically within the same Firestore transaction to `CATALOG_COLLECTION/${item.id}` and `MIGRATION_JOURNALS_COLLECTION/${batchId}`.
- **Crash Recovery Using BatchId Alone**:
  - If migration fails or crashes after committing any item (e.g., `failAfterItems: 1`), calling `rollbackCatalogMigrationV2({ db, batchId })` with zero in-memory before-images retrieves the durable journal from Firestore and cleanly rolls back committed items (Test 14).
- **Merchandising Initialization Concurrency Protection**:
  - Merchandising initialization in `executeCatalogMigrationV2` runs inside an atomic transaction that checks for pre-existing documents, preventing concurrent worker creation from overwriting existing settings.

### 3. Rollback Merchant-Edit Protection (Tests 15 & 16 / Regression Tests B & C)
- **Consistent UPDATE Revision Increment**:
  - `planCatalogMigrationV2` and `executeCatalogMigrationV2` advance document revision monotonically (`plannedRevision + 1`).
- **Transactional Rollback Verification**:
  - Rollback runs inside `db.runTransaction` to serialize against concurrent merchant writes.
  - Rollback inspects `migrationBatch === batchId` and verifies that `currentRev <= targetRev`.
  - If a merchant subsequently edited a migrated product (`currentRev > targetRev` or changed `migrationBatch`), rollback detects the intervening edit, skips the item, records `PROTECTED_MERCHANT_EDIT`, and preserves the merchant edit in Firestore (Test 15).
  - A concurrent merchant update arriving during rollback is safely preserved (Test 16).
  - Accurate status reporting: reports `status: 'PARTIAL'` when conflicts exist alongside restored/deleted items, `status: 'FAILED'` when conflicts blocked all changes, `status: 'COMPLETED'` on complete reversion, and `status: 'NOOP'` when zero items were processed.

### 4. Transaction Callback Retry Safety (Test 17 / Regression Test D)
- **Pure Transaction Callbacks**:
  - Transaction callbacks in `executeCatalogMigrationV2` mutate zero external variables, counters, or maps.
  - Accounting (`executedCount`, `createsCount`, `updatesCount`, `beforeImages`) is performed strictly outside the callback after transaction commit.
  - Verified under simulated transient failures: retrying the transaction callback multiple times does not duplicate accounting (Test 17).

---

## 2. Test & Build Verification Evidence

| Command / Suite | Actual Output / Result | Exit Code | Evaluation & Coverage Notes |
| :--- | :--- | :---: | :--- |
| `npx tsx --test tests/stage2-catalog-crud.test.ts` | **20 passed, 0 failed** (duration 1.89s) | `0` | **VERIFIED:** Covers all 20 Stage 2 requirements including pricing editor journey, canonical seed edits, dynamic price editor save + metadata edit, variant availability disable/re-enable, shipping weights, concurrency via Promise.all, durable migration journal, rollback conflict protection, inactive product suppression, merchandising concurrency end-to-end, crash recovery by batchId alone (Test A), intervening merchant edit protection (Test B), concurrent merchant write during rollback (Test C), and retry accounting safety (Test D). |
| `npm run typecheck` (`tsc --noEmit`) | `allbarka@0.0.0 typecheck` (zero diagnostics) | `0` | **VERIFIED:** Entire codebase types compile cleanly. |
| `npm run lint:hooks` (`eslint src`) | `allbarka@0.0.0 lint:hooks` (zero warnings, zero errors) | `0` | **VERIFIED:** All hook dependency rules satisfied. |
| `npm run build` | Full pipeline: write-build-info, Vite v6.4.3 bundle, esbuild server.cjs (832.4kb), release privacy audit (83 artifacts checked). | `0` | **VERIFIED:** Production assets and server bundle build without errors. |
| `npm run test:backend` | 21 passed, 0 failed | `0` | **VERIFIED:** Backend pricing, order validation, delivery slots, and n8n webhook safety intact. |
| `npm run test:integrations` | 58 passed, 0 failed | `0` | **VERIFIED:** Sheets, WhatsApp commerce router, order outbox, and authentication intact. |
| `npm run test:admin` | 37 passed, 0 failed | `0` | **VERIFIED:** Admin client, search, image audit, operations, and presentation intact. |
| `npm run test:shipping` | 19 passed, 0 failed | `0` | **VERIFIED:** Shipping policy, portion billing weights, hampers, and destination tariffs intact. |
| `npm run test:experience` | 46 passed, 0 failed | `0` | **VERIFIED:** Selection guide, product photo viewer, catalog filters, and auth modals intact. |
| `npm run test:refinements` | 52 passed, 0 failed | `0` | **VERIFIED:** Visual refinements, circular carousel, media overrides, and store updates intact. |
| **Total Automated Tests** | **253 passed, 0 failed** | `0` | **VERIFIED:** 100% test pass rate across entire AllBarka test suite. |

---

## 3. Files Changed in this Patch

### Modified Files:
1. `src/lib/catalogStore.ts`:
   - Added `AdminMerchandisingBundle` and `getAdminMerchandisingBundle(db)`.
   - Updated `publishAdminMerchandising` to strictly require valid non-negative integer `expectedDraftRevision` and `expectedLiveRevision`, returning `PublishMerchandisingResult` with `{ published, draft, draftRevision, liveRevision }`.
2. `src/lib/catalogRouter.ts`:
   - Updated `GET /api/admin/merchandising` to return `{ settings, draft, live, draftRevision, liveRevision }` via `getAdminMerchandisingBundle`.
   - Updated `POST /api/admin/merchandising/publish` to return `{ settings: result.draft, published: result.published, draft: result.draft, draftRevision, liveRevision }`.
3. `src/lib/adminCatalog.ts`:
   - Updated `publishAdminMerchandisingClient(revisions, token)` requiring `{ expectedDraftRevision, expectedLiveRevision }`.
4. `src/components/AdminMerchandisingPanel.tsx`:
   - Added `liveRevision` and `lastSavedSnapshot` tracking; implemented `computeSnapshot` and `hasUnsavedChanges`.
   - Prevented silently publishing unsaved local edits; disabled Publish button and rendered warning badge when draft edits are unsaved.
   - Provided `{ expectedDraftRevision, expectedLiveRevision }` to publish client.
   - Synchronized UI after publish with resulting draft revision.
5. `src/lib/catalogMigrationV2.ts`:
   - Added `status: 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'NOOP'` to `CatalogMigrationV2RollbackResult`.
   - Updated `planCatalogMigrationV2` to advance revision monotonically on `UPDATE` (`plannedRevision + 1`).
   - Updated `executeCatalogMigrationV2` to accept `failAfterItems?: number`, atomically write product mutations and journal recovery records in the same transaction, perform accounting strictly outside the callback for retry safety, and protect merchandising initialization inside a transaction.
   - Updated `rollbackCatalogMigrationV2` to run item rollbacks inside `db.runTransaction`, verify `migrationBatch === batchId` and `currentRev <= targetRev`, record `PROTECTED_MERCHANT_EDIT`, and report `status: 'PARTIAL'` when conflicts exist.
6. `tests/stage2-catalog-crud.test.ts`:
   - Added `tx.delete` support in mock Firestore transaction runner.
   - Added Test 13: Merchandising concurrency protection end-to-end via HTTP router.
   - Added Test 14 (Regression Test A): Fail after first committed mutation and recover using `batchId` alone.
   - Added Test 15 (Regression Test B): Existing product rev 5 -> migration rev 6 -> merchant rev 7 -> rollback preserves merchant edit.
   - Added Test 16 (Regression Test C): Merchant update arriving during rollback is preserved.
   - Added Test 17 (Regression Test D): Transaction callback retry does not duplicate accounting.
7. `docs/RENOVATION_REQUIREMENTS.md`: Updated to v2.7.0.
8. `docs/RENOVATION_HANDOFF.md`: Updated to v2.7.0.

---

## 4. Stage 3 Entry Criteria Checklist

| Check | Item | Status |
| :---: | :--- | :---: |
| 1 | Baseline commit confirmed on `main` and `launch` (`8cf4410`) | **PASS** |
| 2 | Working feature branch active (`feat/renovation-v2`) | **PASS** |
| 3 | Stage 2 Typecheck clean (`npm run typecheck` exited 0) | **PASS** |
| 4 | Stage 2 Production build clean (`npm run build` exited 0) | **PASS** |
| 5 | Stage 2 Linter clean (`npm run lint:hooks` exited 0) | **PASS** |
| 6 | Stage 2 Acceptance test suite passing (20/20 passed) | **PASS** |
| 7 | Full regression test suites passing (253 automated tests passed) | **PASS** |
| 8 | Concurrency, rollback conflict protection, and durable journal verified | **PASS** |
| 9 | Zero production data writes, zero merges to `launch`/`main` | **PASS** |
| 10 | **Explicit User Review & Authorization to Begin Stage 3** | **PENDING USER APPROVAL** |

---

## 5. Scope Boundary & Stopping Gate

**STOPPING POINT:** Execution is stopped here. Stage 2 is completely implemented, verified, and pushed to `feat/renovation-v2`. In accordance with operating instructions:
- We have NOT begun Stage 3 (no packaging MOQ rules engine, no lead times, no pricing rules engine).
- We have NOT redesigned homepage or navigation (Stages 4 & 5).
- We have NOT deployed or performed live database mutations.

Awaiting explicit user review and authorization to proceed to Stage 3.
