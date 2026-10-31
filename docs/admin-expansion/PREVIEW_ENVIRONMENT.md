# Isolated Preview Environment Specification & Operational Boundary

Updated: 01 November 2026 (Asia/Karachi).  
Task: Stage 6 — Firebase/Admin Operational Integration Verification.  
Target: Isolated Preview Environment (`allbarka-preview`).  

---

## 1. Environment & Access Audit Results

- **Firebase CLI Account**: Authenticated as `tahaishaque5@gmail.com`.
- **Enumerated Firebase Projects**:
  1. `allbarka-live` (Project Number: `122227483779`, Resource Location: default, Web App ID: `1:122227483779:web:a99d6ab1d52832d61467b6`).
     - **Classification**: **LIVE PRODUCTION**.
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

1. **Project Identity**:
   - `FIREBASE_PROJECT_ID=allbarka-preview` (distinct GCP project).
   - `FIRESTORE_DATABASE_ID=(default)` (clean Firestore instance).
   - `STORAGE_BUCKET=allbarka-preview.firebasestorage.app`.
2. **Service Account**:
   - Create `preview-admin-sa@allbarka-preview.iam.gserviceaccount.com` with roles:
     - Firebase Admin SDK Administrator Service Agent
     - Cloud Datastore User / Cloud Firestore Owner
     - Storage Object Admin
   - Inject private key as `FIREBASE_PRIVATE_KEY` on the preview host.
3. **Dedicated Test User Accounts**:
   - Provision three distinct identities in the preview project's Firebase Authentication:
     - **Admin**: `preview-admin@allbarka.test` (UID: `preview-admin-uid`, custom claims: `{ admin: true, role: 'admin' }`, emailVerified: true).
     - **Staff Reader**: `preview-staff@allbarka.test` (UID: `preview-staff-uid`, document in `staffAccess/preview-staff-uid`: `{ uid: 'preview-staff-uid', enabled: true, revision: 1 }`, emailVerified: true).
     - **Customer**: `preview-customer@allbarka.test` (UID: `preview-customer-uid`, custom claims: `{ role: 'customer' }`).

---

## 3. Operational Journey Matrix (Isolated Verification)

| # | Step | Description | Expected Endpoint Outcome |
|---|---|---|---|
| 1 | Admin Login & Permissions | Admin with authoritative claim accesses admin routes | `GET /api/admin/catalog/products` -> 200, `GET /api/admin/staff` -> 200 |
| 2 | Deny Unauthenticated / Customer | Requests lacking admin token are rejected | Anonymous -> 401; Customer -> 403 `FORBIDDEN_ADMIN` |
| 3 | Staff Access Boundary | Staff can view orders, cannot mutate catalog, prices, roles, settings | `GET /api/staff/orders` -> 200 (sanitized); `POST /api/admin/catalog/products` -> 403; `PUT /api/admin/catalog/configuration` -> 403; `PUT /api/admin/staff/:uid` -> 403 |
| 4 | Draft Item Lifecycle | Admin creates draft product, reloads, edits | `POST /api/admin/catalog/products` -> 201 (draft, revision 0); `GET /api/admin/catalog/products/:id` -> 200 |
| 5 | Concurrency & Revision Protection | Stale edit with mismatched `expectedRevision` rejected | `PUT /api/admin/catalog/products/:id` -> 409 `CATALOG_REVISION_CONFLICT`; stored record remains intact |
| 6 | Bounded Photo Upload | Upload raster image within 5MB bound to storage bucket | `POST /api/admin/catalog/uploads` -> 201 with public URL; >5MB -> 413; non-raster -> 400; storage fail -> 503 |
| 7 | Preview Publishing | Publish draft product within preview environment | `PUT /api/admin/catalog/products/:id` with `status: 'published'` -> 200; revision incremented |
| 8 | Discovery & Cache Invalidation | Published item appears in catalog & single product PDP; price edit invalidates cache | `GET /api/catalog` -> contains item; `GET /api/catalog/products/:id` -> 200; price edit -> instant cache refresh |
| 9 | Private Field Isolation | Sensitive supplier costs/notes hidden from public views | `GET /api/catalog` & `GET /api/catalog/products/:id` omit `supplierCost`, `supplierNotes`, `costPrice` |
| 10 | Unpriced Recipe Honesty | Missing ingredient rates/recipes remain unpriced Quote on Request | `POST /api/quotes` -> `requiresTeamQuote: true`, `standardPrice: null`, `estimatedTotalPkr: null`; checkout throws `QUOTE_REQUIRED` |
