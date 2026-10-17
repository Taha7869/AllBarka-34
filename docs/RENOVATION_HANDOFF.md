# AllBarka Renovation — Stage 2 Code Review Repairs Handoff & Review Packet v2.8

**Document Version:** 2.8.0  
**Date:** October 17, 2026  
**Baseline Git Commit:** `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`  
**Active Working Branch:** `feat/renovation-v2` (Pushed & tracking `origin/feat/renovation-v2`)  
**Parent / Production Branch:** `launch` (synced with `origin/launch` and `origin/main`)  
**Applicable Instructions Read:** `C:\Users\taha\.gemini\antigravity\scratch\AllBarka-34\AGENTS.md` and `C:\Users\taha\.gemini\config\plugins\science\rules\AGENTS.md`  
**Status:** **STAGE 2 COMPLETED & VERIFIED — HALTED AT ACCEPTANCE GATE**

---

## 1. Executive Summary & Stage 2 Repairs Completed

In response to the latest Stage 2 review on commit `9f60bdd`, both verified blockers in `src/lib/catalogMigrationV2.ts` have been fully resolved and verified with 25/25 passing tests in the Stage 2 acceptance suite:

### 1. Firestore Read-Before-Write Transaction Ordering (Blocker 1)
- **All Reads Precede All Writes**:
  - In `executeItem`, `executeMerch`, and `executeRollbackItem`, all document reads (`transaction.get(docRef)`, `transaction.get(journalRef)`) strictly execute before any mutation write (`transaction.set`, `transaction.delete`).
  - Merchandising initialization and product mutations write to the document and recovery journal atomically after all reads are completed.
- **Shared Transaction Mock Enforcement**:
  - `createMockFirestore.runTransaction` now enforces Google Cloud Firestore's invariant: reading any document after a write throws `FIRESTORE_INVALID_TRANSACTION_ORDER: Firestore transactions require all reads to be executed before all writes`.
  - Added Test 18 proving that the mock strictly rejects reads after writes across different documents.

### 2. Migration Marker & Post-State Fingerprint Rollback Protection (Blocker 2)
- **Exact Batch Ownership & Marker Protection**:
  - Rollback requires exact `migrationBatch === batchId`. If `migrationBatch` is missing or mismatched, rollback produces a protected conflict (`PROTECTED_MERCHANT_EDIT`) and preserves the document without falling back to an unsafe overwrite.
- **Recovery Metadata Requirement**:
  - When rolling back by `batchId`, post-migration recovery metadata (`expectedPostRev` and `expectedFingerprint`) must exist in the durable journal. If missing, rollback halts for that document with `PROTECTED_CONFLICT_MISSING_METADATA`.
- **Post-State Fingerprinting**:
  - `computeDocumentFingerprint(data)` computes a deterministic SHA-256 hash of recursively key-sorted document data.
  - Recorded in `journal.postFingerprints[key]` during migration.
  - Rollback compares `computeDocumentFingerprint(currentDoc) === expectedFingerprint`. If a merchant or script performed direct Firestore modifications with unchanged `revision`, fingerprint mismatch halts with `PROTECTED_MERCHANT_EDIT`, preserving merchant changes.
- **Dedicated Regression Tests (Tests 19–22)**:
  - Test 19: Missing `migrationBatch` marker produces conflict.
  - Test 20: Mismatched `migrationBatch` marker produces conflict.
  - Test 21: Same revision with modified title/price produces fingerprint mismatch conflict.
  - Test 22: Missing post-state recovery metadata produces conflict.

### 3. Preserved Merchandising Concurrency Protection
- `AdminMerchandisingPanel.handlePublish` and `publishAdminMerchandisingClient` continue to strictly send `{ expectedDraftRevision, expectedLiveRevision }`.
- Backend validates tokens as non-negative integers (rejecting missing/stale with HTTP 409).
- Local unsaved draft edits block publication.
- UI synchronizes with resulting `draftRevision`.

---

## 2. Test & Build Verification Evidence

| Command / Suite | Actual Output / Result | Exit Code | Evaluation & Coverage Notes |
| :--- | :--- | :---: | :--- |
| `npx tsx --test tests/stage2-catalog-crud.test.ts` | **25 passed, 0 failed** (duration 1.87s) | `0` | **VERIFIED:** Covers all 25 Stage 2 requirements including pricing editor journey, canonical seed edits, dynamic price editor save + metadata edit, variant availability disable/re-enable, shipping weights, concurrency via Promise.all, durable migration journal, rollback conflict protection, inactive product suppression, merchandising concurrency end-to-end, crash recovery by batchId alone (Test A), intervening merchant edit protection (Test B), concurrent merchant write during rollback (Test C), retry accounting safety (Test D), mock read-before-write enforcement (Test 18), missing migrationBatch marker (Test 19), mismatched migrationBatch marker (Test 20), post-state fingerprint protection (Test 21), and missing recovery metadata protection (Test 22). |
| `npm run typecheck` (`tsc --noEmit`) | `allbarka@0.0.0 typecheck` (zero diagnostics) | `0` | **VERIFIED:** Entire codebase types compile cleanly. |
| `npm run lint:hooks` (`eslint src`) | `allbarka@0.0.0 lint:hooks` (zero warnings, zero errors) | `0` | **VERIFIED:** All hook dependency rules satisfied. |
| `npm run build` | Full pipeline: write-build-info, Vite v6.4.3 bundle, esbuild server.cjs (832.4kb), release privacy audit (83 artifacts checked). | `0` | **VERIFIED:** Production assets and server bundle build without errors. |
| `npm run test:backend` | 21 passed, 0 failed | `0` | **VERIFIED:** Backend pricing, order validation, delivery slots, and n8n webhook safety intact. |
| `npm run test:integrations` | 58 passed, 0 failed | `0` | **VERIFIED:** Sheets, WhatsApp commerce router, order outbox, and authentication intact. |
| `npm run test:admin` | 37 passed, 0 failed | `0` | **VERIFIED:** Admin client, search, image audit, operations, and presentation intact. |
| `npm run test:shipping` | 19 passed, 0 failed | `0` | **VERIFIED:** Shipping policy, portion billing weights, hampers, and destination tariffs intact. |
| `npm run test:experience` | 46 passed, 0 failed | `0` | **VERIFIED:** Selection guide, product photo viewer, catalog filters, and auth modals intact. |
| `npm run test:refinements` | 52 passed, 0 failed | `0` | **VERIFIED:** Visual refinements, circular carousel, media overrides, and store updates intact. |
| **Total Automated Tests** | **258 passed, 0 failed** | `0` | **VERIFIED:** 100% test pass rate across all suites. |

---

## 3. Firestore Emulator Status

- **Status:** **BLOCKED (Emulator / firebase-tools not installed in local environment)**
- **Audit Findings:** Neither `firebase` CLI nor `firebase-tools` are installed in the local environment (`firebase: command not found`, `npx firebase` failed with exit 1).
- **Production Readiness Stance:** Production readiness is **NOT** claimed for live cloud Firestore mutations. Zero production writes have been performed, zero live database operations have been executed, and all migration and CRUD guarantees are validated via comprehensive in-memory mock suites mirroring real Firestore transaction ordering and document behavior.

---

## 4. Files Changed in this Patch

### Modified Files:
1. `src/lib/catalogMigrationV2.ts`:
   - Imported `createHash` from `node:crypto`.
   - Added `computeDocumentFingerprint(data)` (canonical sorted SHA-256 document fingerprint).
   - Enforced strict read-before-write transaction ordering in `executeItem`, `executeMerch`, and `executeRollbackItem`.
   - Persisted `postFingerprints` alongside `postRevisions` in migration journal atomically.
   - Enforced exact `migrationBatch` ownership check, required recovery metadata, and fingerprint matching in `rollbackCatalogMigrationV2`.
2. `tests/stage2-catalog-crud.test.ts`:
   - Updated `createMockFirestore.runTransaction` to enforce read-before-write rule across all documents (`FIRESTORE_INVALID_TRANSACTION_ORDER`).
   - Added Test 18: Shared transaction test mock strictly rejects any read after a write.
   - Added Test 19: Rollback conflict when migrationBatch marker is missing.
   - Added Test 20: Rollback conflict when migrationBatch marker does not match batchId.
   - Added Test 21: Rollback conflict when revision is unchanged but title/price modified (fingerprint check).
   - Added Test 22: Rollback conflict when post-state recovery metadata is missing.
3. `docs/RENOVATION_REQUIREMENTS.md`: Updated to v2.8.0.
4. `docs/RENOVATION_HANDOFF.md`: Updated to v2.8.0.

---

## 5. Stage 3 Entry Criteria Checklist

| Check | Item | Status |
| :---: | :--- | :---: |
| 1 | Baseline commit confirmed on `main` and `launch` (`8cf4410`) | **PASS** |
| 2 | Working feature branch active (`feat/renovation-v2`) | **PASS** |
| 3 | Stage 2 Typecheck clean (`npm run typecheck` exited 0) | **PASS** |
| 4 | Stage 2 Production build clean (`npm run build` exited 0) | **PASS** |
| 5 | Stage 2 Linter clean (`npm run lint:hooks` exited 0) | **PASS** |
| 6 | Stage 2 Acceptance test suite passing (25/25 passed) | **PASS** |
| 7 | Full regression test suites passing (258 automated tests passed) | **PASS** |
| 8 | Read-before-write transaction ordering & post-state fingerprinting verified | **PASS** |
| 9 | Firestore Emulator status reported honestly (`BLOCKED`) | **PASS** |
| 10 | Zero production data writes, zero merges to `launch`/`main` | **PASS** |
| 11 | **Explicit User Review & Authorization to Begin Stage 3** | **PENDING USER APPROVAL** |

---

## 6. Scope Boundary & Stopping Gate

**STOPPING POINT:** Execution is stopped here. Stage 2 is completely implemented, verified, and pushed to `feat/renovation-v2`. In accordance with operating instructions:
- We have NOT begun Stage 3 (no packaging MOQ rules engine, no lead times, no pricing rules engine).
- We have NOT redesigned homepage or navigation (Stages 4 & 5).
- We have NOT deployed or performed live database mutations.

Awaiting explicit user review and authorization to proceed to Stage 3.
