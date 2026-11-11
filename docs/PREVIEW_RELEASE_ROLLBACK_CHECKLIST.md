# AllBarka Preview, Release & Rollback Checklist

> [!NOTE]
> This checklist is prepared for the project owner to execute during an interactive PC session when ready to provision the cloud preview environment, review merchant decisions, and prepare for any future authorized release.
> Manual cloud provisioning, live credential rotation, live data migrations, and production releases remain **deferred** while the owner is away.

---

## Part 1: Preview Cloud Environment Provisioning (Pending Owner on PC)

When ready on PC:
1. **Create Isolated GCP Project:**
   - Create project `allbarka-preview` in Google Cloud Console.
   - Enable Firestore in Native Mode (database `(default)`).
   - Enable Firebase Authentication (Email/Password & Google Sign-In).
   - Create Cloud Storage bucket `allbarka-preview.firebasestorage.app`.
2. **IAM & Service Account Setup:**
   - Create service account `preview-server@allbarka-preview.iam.gserviceaccount.com`.
   - Grant standard roles: `roles/datastore.user` (Firestore), `roles/storage.objectAdmin` (Storage), `roles/firebaseauth.admin` (Auth).
   - Generate JSON private key and store safely in local `.env.preview`.
3. **Configure Environment Secrets:**
   - Create `.env.preview` with validated preview fields:
     ```env
     ALLBARKA_MODE=preview
     FIREBASE_PROJECT_ID=allbarka-preview
     STORAGE_BUCKET=allbarka-preview.firebasestorage.app
     FIREBASE_CLIENT_EMAIL=preview-server@allbarka-preview.iam.gserviceaccount.com
     FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
     VITE_FIREBASE_PROJECT_ID=allbarka-preview
     VITE_FIREBASE_STORAGE_BUCKET=allbarka-preview.firebasestorage.app
     VITE_FIREBASE_AUTH_DOMAIN=allbarka-preview.firebaseapp.com
     VITE_FIREBASE_API_KEY=<preview-web-api-key>
     VITE_FIREBASE_APP_ID=<preview-web-app-id>
     ```
4. **Merchant Catalog Confirmation & Revisioned Admin Workflow:**
   - Review [`docs/evidence/catalog-audit/MERCHANT_REVIEW_PACKET.md`](evidence/catalog-audit/MERCHANT_REVIEW_PACKET.md) to confirm selling prices, 1kg rates, and publication statuses.
   - Note: `scripts/migrate-catalog-v2.ts` plans migrations from compiled `PRODUCTS` in source code; it does not import `merchant-data-entry-packet.json`.
   - Confirmed records must be created through the existing revisioned admin APIs:
     - Use `updateAdminProduct` / `createAdminProduct` for celebration box products (`bid-box-*`).
     - Use `updateHamperBoxPricing` for hamper boxes (`box-wood`, `box-velvet`, `box-tin`).
     - Alternatively, use Admin Studio (`/admin/studio`) once signed in as an authorized admin.
   - Advance product revisions monotonically (`expectedRevision`), ensuring no blind data overwrite.

---

## Part 2: Release Verification Checklist

Before pointing production traffic or releasing PR #16:
- [ ] **Catalog Audit Clean:** `npx tsx scripts/report-catalog-health.ts --snapshot=<target-snapshot>` reports 0 unexpected definite failures.
- [ ] **All Test Gates Passed:**
  - `npm run typecheck` (0 errors)
  - `npm run lint:hooks` (0 warnings)
  - `npm run build` (84+ artifacts clean)
  - `node scripts/run-all-tests.mjs` (770+ tests passing)
  - `node scripts/verify-production.mjs` (36 production checks passing)
- [ ] **SEO & Indexing Safeguards:**
  - `public/robots.txt` disallows `/api/`, `/admin`, `/staff`, `/checkout`, `/cart`.
  - Preview environment enforces `X-Robots-Tag: noindex, nofollow` globally.
  - Production canonical links resolve to `https://allbarka.com/`.
- [ ] **Zero Customer PII in Logs/Outbox:**
  - Verify outbox payload projection strips admin notes, credentials, and customer payment secrets.
- [ ] **Receiver-Before-Sender Ordering (Strict Invariant):**
  - Verify the n8n webhook receiver endpoint is deployed, verified, and accepting compatible payloads (including long wire labels for celebration boxes) before enabling live outbox dispatch. Never deploy sender before receiver.

---

## Part 3: Rollback & Compatibility Analysis

If unexpected runtime defects occur after a future authorized deployment:

1. **Identify the Actual Deployed Artifact:**
   - Query `/api/health` and deployment platform metadata to inspect the currently running commit hash and version watermark.
   - Do NOT assume the previous deployment was commit `8cf4410` or roll back blindly without checking current production state.
2. **Compatibility Preconditions for Rollback:**
   - **Schema Compatibility:** Ensure the target rollback server can parse all stored Firestore document structures. Older server code may fail validation on newer schema fields (such as `schemaVersion: 1`, explicit `status`, or long variant labels).
   - **Receipt & Idempotency Replay:** Confirm that previously stored orders and inquiry receipts in Firestore remain replayable without schema mismatch errors.
   - **Outbox State:** Verify that pending outbox jobs in Firestore are paused before rolling back to prevent conflicting deliveries or repeated dispatch attempts.
   - **n8n Receiver Alignment:** Verify whether the active n8n workflow accepts the older or newer payload formats before switching deployment versions.
3. **Rollback Execution Steps:**
   - In Railway or Cloud Run, redeploy the verified, compatible previous release artifact.
   - Immediately verify `/api/health`, `/api/commerce/readiness`, and `/api/catalog` return HTTP 200.
   - Perform read-only catalog check to confirm customer storefront displays properly without unhandled runtime exceptions.
