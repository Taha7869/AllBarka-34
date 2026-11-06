# Isolated Preview Environment Specification & Operational Boundary

Updated: 01 November 2026 (Asia/Karachi).  
Task: Stage 6 — Firebase/Admin Operational Integration Verification & Isolation Repair.
Target: Isolated Preview Environment (`allbarka-preview`).  

---

## 1. Environment & Access Audit Results

- **Firebase CLI Account**: Authenticated as `tahaishaque5@gmail.com`.
- **Enumerated Firebase Projects**:
  1. `allbarka-live` (Project Number: `122227483779`, Resource Location: default, Web App ID: `1:122227483779:web:a99d6ab1d52832d61467b6`).
     - **Classification**: **LIVE PRODUCTION DATABASE**.
     - **Contents**: 89 real merchant catalog items (including canonical `pista` revision 2), live customer orders, registered patrons.
     - **Operational Rule**: **STRICTLY PROTECTED**. Zero live mutation tests, test product creation, test photo uploads, role modification, or live rules deployment are permitted against `allbarka-live`.
  2. `primal-circuit-ck76w` (Project Number: `742339582337`).
     - **Classification**: Unrelated AI Studio prototype project. Not associated with AllBarka.
- **Identified Gap / Missing Target**:
  - No isolated test or preview Firebase project (e.g. `allbarka-preview`) is currently provisioned under this account.
  - Server Admin credentials (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) for a preview service account are not yet injected into the execution environment.
  - As per Lead Architect instructions: **Production must not be silently used for mutation tests, and mocked results must not be substituted for live integration evidence.**

---

## 2. Concrete Preview Configuration Requirements

To complete live provider execution, the merchant / DevOps team must provision an isolated Google Cloud / Firebase project matching the template in `.env.preview.example`:

### A. Project & Bucket Identity
- `FIREBASE_PROJECT_ID=allbarka-preview` (distinct GCP project).
- `FIRESTORE_DATABASE_ID=(default)` (clean Firestore instance).
- `STORAGE_BUCKET=allbarka-preview.firebasestorage.app` (isolated storage bucket; resolved directly by `server.ts`).

### B. Service Account & Least-Privilege IAM Roles
Create service account `preview-admin-sa@allbarka-preview.iam.gserviceaccount.com`. In accordance with official Google Cloud & Firebase least-privilege security guidance, assign only the specific roles required for backend administration:
- **Cloud Datastore User** (`roles/datastore.user`): Provides read/write access to Cloud Firestore documents and indexes. (Do **not** use blanket `Owner` or `Cloud Datastore Owner`).
- **Firebase Authentication Admin** (`roles/firebaseauth.admin`): Grants permissions to look up accounts by email/UID, manage custom claims (`admin`, `staff`), and verify session cookies. (Do **not** assign internal Google-managed `Service Agent` roles to ordinary service accounts).
- **Storage Object Admin** (`roles/storage.objectAdmin`): Grants read, write, and delete permissions on objects within the preview storage bucket (`allbarka-preview.firebasestorage.app`).

Inject the service account private key as `FIREBASE_PRIVATE_KEY` and client email as `FIREBASE_CLIENT_EMAIL` on the preview host.

### C. Dedicated Test User Accounts & Staff Setup
Provision three distinct identities in the preview project's Firebase Authentication:
1. **Admin**: `preview-admin@allbarka.test` (UID: `preview-admin-uid`, custom claims: `{ admin: true, role: 'admin' }`, `emailVerified: true`).
2. **Staff Reader**: `preview-staff@allbarka.test` (UID: `preview-staff-uid`, `emailVerified: true`).
   - **Schema Requirement**: In accordance with `src/lib/staffAccess.ts:22`, the Firestore document `staffAccess/preview-staff-uid` must include `version: 1`:
     ```json
     {
       "version": 1,
       "uid": "preview-staff-uid",
       "email": "preview-staff@allbarka.test",
       "enabled": true,
       "revision": 1,
       "updatedAt": "2026-11-01T00:00:00.000Z"
     }
     ```
   - **Revisioned Admin Workflow**: Alternatively, grant access via the authoritative admin API endpoint `PUT /api/admin/staff/preview-staff-uid` with `{ "enabled": true, "expectedRevision": 0 }`. This atomically writes the record with `version: 1` and logs an entry to `staffAccessAudits`.
3. **Customer**: `preview-customer@allbarka.test` (UID: `preview-customer-uid`, custom claims: `{ role: 'customer' }`).

---

## 3. How to Load and Run Preview Settings

The server and frontend do not guess environment files. Use the following tested commands:

### Server (Express API)
1. **Explicit Environment Mode (loads `.env.preview` automatically)**:
   - PowerShell: `$env:ALLBARKA_MODE="preview"; node build/server.cjs` (or `npx tsx server.ts`)
   - Bash: `ALLBARKA_MODE=preview node build/server.cjs`
2. **Native Node.js 20+ Environment File**:
   - `node --env-file=.env.preview build/server.cjs`
3. **Explicit `ENV_FILE` Pointer**:
   - PowerShell: `$env:ENV_FILE=".env.preview"; node build/server.cjs`
   - Bash: `ENV_FILE=.env.preview node build/server.cjs`

### Client (Vite Frontend)
- `npx vite --mode preview` (Vite automatically loads `.env.preview`).

### Automated Test Runner
- `node --env-file=.env.preview --import tsx --test --test-isolation=none tests/stage6-operational-integration.test.ts`

---

## 4. Runtime Isolation Enforcement (`src/lib/environmentConfig.ts`)

Runtime safety is enforced programmatically rather than relying on manual file audits:
- **Production Target Rejection**: Any attempt in preview mode to use `allbarka-live`, `allbarka-live.firebasestorage.app`, or `allbarka-live.firebaseapp.com` throws a `ConfigurationError` (`PRODUCTION_TARGET_REJECTED`) before any Auth, Firestore, or Storage call is made.
- **Mixed Configuration Rejection**: Mismatches between server `FIREBASE_PROJECT_ID` / `STORAGE_BUCKET` and client `VITE_*` variables throw `MIXED_CONFIGURATION_DETECTED`.
- **Upload Bucket Resolution**: `server.ts` uses `resolveStorageBucket(process.env)`, which validates and returns the preview bucket from `STORAGE_BUCKET`, preventing accidental fallback to the production config bucket.
- **Client Zero-Fallback**: In preview mode, `resolveFirebaseClientConfig` requires explicit preview client settings and never falls back to production `firebase-applet-config.json`.

---

## 5. Operational Journey Matrix (Local Fixture Evidence)

> [!NOTE]
> The steps below are validated against local isolated fixtures (`memoryFirestore`, mock Auth identities, and loopback Express server). Real cloud provider verification remains explicitly **BLOCKED** until a dedicated `allbarka-preview` GCP/Firebase project is provisioned.

| # | Step | Description | Expected Endpoint Outcome | Status |
|---|---|---|---|---|
| 1 | Admin Login & Permissions | Admin with authoritative claim accesses admin routes | `GET /api/admin/catalog/products` -> 200, `GET /api/admin/staff` -> 200 | Local Fixture Verified |
| 2 | Deny Unauthenticated / Customer | Requests lacking admin token are rejected | Anonymous -> 401; Customer -> 403 `FORBIDDEN_ADMIN` | Local Fixture Verified |
| 3 | Staff Access Boundary | Staff can view orders, cannot mutate catalog, prices, roles, settings | `GET /api/staff/orders` -> 200 (sanitized); `POST /api/admin/catalog/products` -> 403; `PUT /api/admin/catalog/configuration` -> 403; `PUT /api/admin/staff/:uid` -> 403 | Local Fixture Verified |
| 4 | Draft Item Lifecycle | Admin creates draft product, reloads, edits | `POST /api/admin/catalog/products` -> 201 (draft, revision 1); `GET /api/admin/catalog/products/:id` -> 200 | Local Fixture Verified |
| 5 | Concurrency & Revision Protection | Stale edit with mismatched `expectedRevision` rejected | `PUT /api/admin/catalog/products/:id` -> 409 `CATALOG_REVISION_CONFLICT`; stored record remains intact | Local Fixture Verified |
| 6 | Bounded Photo Upload | Upload raster image within 5MB bound to storage bucket | `POST /api/admin/catalog/uploads` -> 201 with bucket URL; >5MB -> 413; non-raster -> 400; storage fail -> 503 | Local Fixture Verified |
| 7 | Preview Publishing | Publish draft product within preview environment | `PUT /api/admin/catalog/products/:id` with `status: 'published'` -> 200; revision incremented | Local Fixture Verified |
| 8 | Discovery & Cache Invalidation | Published item appears in catalog & single product PDP; price edit invalidates cache | `GET /api/catalog` -> contains item; `GET /api/catalog/products/:id` -> 200; price edit -> instant cache refresh | Local Fixture Verified |
| 9 | Private Field Isolation | Sensitive supplier costs/notes hidden from public views | `GET /api/catalog` & `GET /api/catalog/products/:id` omit `supplierCost`, `internalNotes`, `updatedBy` | Local Fixture Verified |
| 10 | Unpriced Recipe Honesty | Missing ingredient rates/recipes remain unpriced Quote on Request | `POST /api/quotes` -> `requiresTeamQuote: true`, `standardPrice: null`, `estimatedTotalPkr: null`; checkout throws `QUOTE_REQUIRED` | Local Fixture Verified |
