# AllBarka Preview, Release & Rollback Checklist

> [!NOTE]
> This checklist is prepared for the project owner to execute during an interactive PC session when ready to provision the cloud preview environment and proceed to live deployment.

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
   - Create `.env.preview` with:
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
4. **Seed Merchant Catalog Review Data:**
   - Import `docs/evidence/catalog-audit/merchant-data-entry-packet.json` into `allbarka-preview` Firestore using `scripts/migrate-catalog-v2.ts`.
   - Verify 8 celebration boxes and 3 hamper boxes are visible in Admin Studio.

---

## Part 2: Release Verification Checklist

Before pointing production traffic or releasing PR #16:
- [ ] **Catalog Audit Clean:** `npx tsx scripts/report-catalog-health.ts` reports 0 unexpected definite failures.
- [ ] **All Test Gates Passed:**
  - `npm run typecheck` (0 errors)
  - `npm run lint:hooks` (0 warnings)
  - `npm run build` (84+ artifacts clean)
  - `node scripts/run-all-tests.mjs` (760+ tests passing)
  - `node scripts/verify-production.mjs` (36 production checks passing)
- [ ] **SEO & Indexing Safeguards:**
  - `public/robots.txt` disallows `/api/`, `/admin`, `/staff`, `/checkout`, `/cart`.
  - Preview environment enforces `X-Robots-Tag: noindex, nofollow` globally.
  - Production canonical links resolve to `https://allbarka.com/`.
- [ ] **Zero Customer PII in Logs/Outbox:**
  - Verify outbox payload projection strips admin notes, credentials, and customer payment secrets.
- [ ] **Receiver-Before-Sender Order:**
  - Confirm n8n order receiver workflow is active and authenticated before enabling live outbox dispatch.

---

## Part 3: Rollback Procedure

If unexpected runtime defects occur after deployment:

1. **Fast Rollback (Deployment Platform / Railway):**
   - In Railway or Cloud Run console, revert active deployment to previous stable commit: `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`.
   - Service will instantly fall back to previous server bundle.
2. **Git Branch Recovery:**
   - If git revert is needed on repository:
     ```bash
     git checkout main
     git pull origin main
     # Revert release merge commit if necessary
     ```
3. **Database Safeguard:**
   - Stored Firestore documents use monotonic schema versions (`schemaVersion: 1`, `schemaVersion: 2.0.0`). Older server versions ignore newer additive fields without crashing.
   - Outbox worker fails closed (`deliveryState: 'PENDING'`) if webhooks are unreachable, ensuring zero lost orders during rollback.
