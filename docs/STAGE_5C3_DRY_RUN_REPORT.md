# Stage 5C3 Catalog Ingestion Dry-Run Report

**Branch**: `feat/renovation-v2`  
**Execution Time**: 2026-10-18T22:12:31.565Z  
**Environment**: In-Memory Fixture Dry Run (Zero Live Ingestion / Zero Firestore Writes)

---

## 1. Executive Summary & Processing Totals

| Metric | Count | Notes |
| :--- | :---: | :--- |
| **Total Records Processed** | **33** | 30 catalog roster items + 3 Group D unverified concepts |
| **Proposed for Creation (Drafts)** | **22** | Validated via `validateDynamicProduct` (status=`draft`, active=`false`) |
| **Existing Catalog Records Skipped** | **8** | Active packaging IDs preserved with existing prices, variants, and media |
| **Duplicates Skipped in Batch** | **0** | Re-import idempotency protected; no compounded pricing |
| **Unverified Concepts Excluded** | **3** | Group D proposed acrylic concepts strictly excluded |
| **Schema Validation Errors** | **0** | 0 schema errors; all candidate drafts meet validation rules |

---

## 2. Category Breakdown & Shortfall Analysis

| Subcategory | Target | Active Existing | Proposed Drafts | Verified Total | Needs Revision | Quota Blocked | Deferred | Gap / Shortfall |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **tin** | 6 | 1 | 6 | **7** | 0 | 0 | 0 | **0 (Met)** |
| **tabarruk** | 6 | 1 | 5 | **6** | 2 | 1 | 0 | **0 (Met)** |
| **wedding** | 6 | 4 | 4 | **8** | 0 | 3 | 0 | **0 (Met)** |
| **baby** | 6 | 1 | 6 | **7** | 0 | 4 | 1 | **0 (Met)** |
| **acrylic** | 6 | 1 | 1 | **2** | 0 | 0 | 0 | **4 Short** |


> [!WARNING]

> **Acrylic Shortfall Notice**: Category 5 (Personalized Acrylic Boxes) has an explicit **4-product shortfall** against the 6-product target. Exactly 2 products exist in the verified roster (1 existing + 1 verified reference). The 3 proposed concepts remain strictly excluded in Group D.

---

## 3. Media Audit & Publication Blockers

### Media Audit Totals

- **Active Storefront Assets (Existing)**: 8
- **Approved Draft Concept Renders**: 11
- **Needs Revision Concept Renders**: 2 (`tabarruk-set-012` [component mismatch], `tabarruk-set-tijori` [concept feature disparity])
- **Quota-Blocked Image Generation Tasks**: 8 (pending upstream `gemini-3.1-flash-image` quota reset)
- **Deferred Variable Families**: 1 (`baby-box-017` pending dimensional measurements per tier)

### Publication Blockers Tally

A record can be a completely valid unpublished draft while being strictly blocked from live publication:

| Blocker Code | Affected Records | Description |
| :--- | :---: | :--- |
| `SUPPLIER_SAMPLE_UNCONFIRMED` | **11** | Prevents premature publication to public storefront |
| `DRAFT_STATUS_UNPUBLISHED` | **22** | Prevents premature publication to public storefront |
| `MEDIA_NEEDS_REVISION` | **2** | Prevents premature publication to public storefront |
| `MEDIA_BLOCKED_BY_QUOTA` | **8** | Prevents premature publication to public storefront |
| `VARIABLE_FAMILY_UNVERIFIED_DIMENSIONS` | **1** | Prevents premature publication to public storefront |
| `UNVERIFIED_CONCEPT` | **3** | Prevents premature publication to public storefront |


---

## 4. Item-by-Item Dry-Run Results


### `bid-box-luxury-tin` — Action: `skipped_existing`

- **Status**: Existing Catalog Product (Active)
- **Preservation**: Product "bid-box-luxury-tin" already exists in live catalog. Existing prices, variants, filled options, and media preserved unchanged.

### `tin-box-002` — Action: `proposed_draft`

- **Subcategory**: `tin`
- **Authoritative Price**: Rs. 105.00 (Display: Rs. 105)
- **Derived MOQ (Pieces)**: **25 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `approved_draft`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - SUPPLIER_SAMPLE_UNCONFIRMED: Concept render approved; awaiting physical supplier sample and stock receipt confirmation.
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `tin-box-004` — Action: `proposed_draft`

- **Subcategory**: `tin`
- **Authoritative Price**: Rs. 105.00 (Display: Rs. 105)
- **Derived MOQ (Pieces)**: **25 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `approved_draft`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - SUPPLIER_SAMPLE_UNCONFIRMED: Concept render approved; awaiting physical supplier sample and stock receipt confirmation.
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `tin-box-008` — Action: `proposed_draft`

- **Subcategory**: `tin`
- **Authoritative Price**: Rs. 105.00 (Display: Rs. 105)
- **Derived MOQ (Pieces)**: **25 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `approved_draft`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - SUPPLIER_SAMPLE_UNCONFIRMED: Concept render approved; awaiting physical supplier sample and stock receipt confirmation.
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `tin-box-green` — Action: `proposed_draft`

- **Subcategory**: `tin`
- **Authoritative Price**: Rs. 105.00 (Display: Rs. 105)
- **Derived MOQ (Pieces)**: **25 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `approved_draft`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - SUPPLIER_SAMPLE_UNCONFIRMED: Concept render approved; awaiting physical supplier sample and stock receipt confirmation.
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `tin-box-beige` — Action: `proposed_draft`

- **Subcategory**: `tin`
- **Authoritative Price**: Rs. 105.00 (Display: Rs. 105)
- **Derived MOQ (Pieces)**: **25 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `approved_draft`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - SUPPLIER_SAMPLE_UNCONFIRMED: Concept render approved; awaiting physical supplier sample and stock receipt confirmation.
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `tin-box-baby-boy` — Action: `proposed_draft`

- **Subcategory**: `tin`
- **Authoritative Price**: Rs. 126.00 (Display: Rs. 126)
- **Derived MOQ (Pieces)**: **25 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `approved_draft`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - SUPPLIER_SAMPLE_UNCONFIRMED: Concept render approved; awaiting physical supplier sample and stock receipt confirmation.
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `bid-box-umrah-tabarruk` — Action: `skipped_existing`

- **Status**: Existing Catalog Product (Active)
- **Preservation**: Product "bid-box-umrah-tabarruk" already exists in live catalog. Existing prices, variants, filled options, and media preserved unchanged.

### `tabarruk-set-004` — Action: `proposed_draft`

- **Subcategory**: `tabarruk`
- **Authoritative Price**: Rs. 210.00 (Display: Rs. 210)
- **Derived MOQ (Pieces)**: **24 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `approved_draft`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - SUPPLIER_SAMPLE_UNCONFIRMED: Concept render approved; awaiting physical supplier sample and stock receipt confirmation.
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `tabarruk-set-classic` — Action: `proposed_draft`

- **Subcategory**: `tabarruk`
- **Authoritative Price**: Rs. 210.00 (Display: Rs. 210)
- **Derived MOQ (Pieces)**: **24 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `approved_draft`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - SUPPLIER_SAMPLE_UNCONFIRMED: Concept render approved; awaiting physical supplier sample and stock receipt confirmation.
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `tabarruk-set-012` — Action: `proposed_draft`

- **Subcategory**: `tabarruk`
- **Authoritative Price**: Rs. 210.00 (Display: Rs. 210)
- **Derived MOQ (Pieces)**: **24 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `needs_revision`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - MEDIA_NEEDS_REVISION: Component mismatch: Generated render depicts rigid gift box and hexagonal glass jar; reference specifies matching carrier bag, circular tin, and 120ml bottle. Excluded from publication candidates pending re-render.
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `tabarruk-set-tijori` — Action: `proposed_draft`

- **Subcategory**: `tabarruk`
- **Authoritative Price**: Rs. 420.00 (Display: Rs. 420)
- **Derived MOQ (Pieces)**: **12 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `needs_revision`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - MEDIA_NEEDS_REVISION: Feature disparity: Generated render depicts elaborate domed chest with brass latch hardware, velvet interior lining, dual favor tins, and glass flask; source reference is a structured Tijori-pattern carrier bag and matching favor box suite. Elaborate hardware, lining, and extra vessels are unverified proposed concepts excluded from confirmed reference contents.
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `tabarruk-set-no43` — Action: `proposed_draft`

- **Subcategory**: `tabarruk`
- **Authoritative Price**: Rs. 367.50 (Display: Rs. 368)
- **Derived MOQ (Pieces)**: **14 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `blocked_by_quota`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - MEDIA_BLOCKED_BY_QUOTA: Asset generation blocked by upstream Gemini Image API capacity exhaustion (429 RESOURCE_EXHAUSTED).
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `bid-box-pyramid-favor` — Action: `skipped_existing`

- **Status**: Existing Catalog Product (Active)
- **Preservation**: Product "bid-box-pyramid-favor" already exists in live catalog. Existing prices, variants, filled options, and media preserved unchanged.

### `bid-box-card-nikkah` — Action: `skipped_existing`

- **Status**: Existing Catalog Product (Active)
- **Preservation**: Product "bid-box-card-nikkah" already exists in live catalog. Existing prices, variants, filled options, and media preserved unchanged.

### `bid-box-jute-pouch` — Action: `skipped_existing`

- **Status**: Existing Catalog Product (Active)
- **Preservation**: Product "bid-box-jute-pouch" already exists in live catalog. Existing prices, variants, filled options, and media preserved unchanged.

### `bid-box-sweet-nikkah` — Action: `skipped_existing`

- **Status**: Existing Catalog Product (Active)
- **Preservation**: Product "bid-box-sweet-nikkah" already exists in live catalog. Existing prices, variants, filled options, and media preserved unchanged.

### `wedding-card-box-001` — Action: `proposed_draft`

- **Subcategory**: `wedding`
- **Authoritative Price**: Rs. 78.75 (Display: Rs. 79)
- **Derived MOQ (Pieces)**: **25 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `approved_draft`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - SUPPLIER_SAMPLE_UNCONFIRMED: Concept render approved; awaiting physical supplier sample and stock receipt confirmation.
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `wedding-pyramid-box` — Action: `proposed_draft`

- **Subcategory**: `wedding`
- **Authoritative Price**: Rs. 31.50 (Display: Rs. 32)
- **Derived MOQ (Pieces)**: **25 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `blocked_by_quota`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - MEDIA_BLOCKED_BY_QUOTA: Asset generation blocked by upstream Gemini Image API capacity exhaustion (429 RESOURCE_EXHAUSTED).
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `wedding-pouch-054` — Action: `proposed_draft`

- **Subcategory**: `wedding`
- **Authoritative Price**: Rs. 63.00 (Display: Rs. 63)
- **Derived MOQ (Pieces)**: **25 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `blocked_by_quota`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - MEDIA_BLOCKED_BY_QUOTA: Asset generation blocked by upstream Gemini Image API capacity exhaustion (429 RESOURCE_EXHAUSTED).
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `wedding-two-piece-box` — Action: `proposed_draft`

- **Subcategory**: `wedding`
- **Authoritative Price**: Rs. 84.00 (Display: Rs. 84)
- **Derived MOQ (Pieces)**: **25 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `blocked_by_quota`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - MEDIA_BLOCKED_BY_QUOTA: Asset generation blocked by upstream Gemini Image API capacity exhaustion (429 RESOURCE_EXHAUSTED).
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `bid-box-birth-announcement` — Action: `skipped_existing`

- **Status**: Existing Catalog Product (Active)
- **Preservation**: Product "bid-box-birth-announcement" already exists in live catalog. Existing prices, variants, filled options, and media preserved unchanged.

### `baby-box-half-kg` — Action: `proposed_draft`

- **Subcategory**: `baby`
- **Authoritative Price**: Rs. 273.00 (Display: Rs. 273)
- **Derived MOQ (Pieces)**: **19 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `approved_draft`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - SUPPLIER_SAMPLE_UNCONFIRMED: Concept render approved; awaiting physical supplier sample and stock receipt confirmation.
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `baby-box-3in-round` — Action: `proposed_draft`

- **Subcategory**: `baby`
- **Authoritative Price**: Rs. 105.00 (Display: Rs. 105)
- **Derived MOQ (Pieces)**: **25 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `blocked_by_quota`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - MEDIA_BLOCKED_BY_QUOTA: Asset generation blocked by upstream Gemini Image API capacity exhaustion (429 RESOURCE_EXHAUSTED).
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `baby-box-250g-part` — Action: `proposed_draft`

- **Subcategory**: `baby`
- **Authoritative Price**: Rs. 157.50 (Display: Rs. 158)
- **Derived MOQ (Pieces)**: **25 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `blocked_by_quota`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - MEDIA_BLOCKED_BY_QUOTA: Asset generation blocked by upstream Gemini Image API capacity exhaustion (429 RESOURCE_EXHAUSTED).
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `baby-box-girl-7x5` — Action: `proposed_draft`

- **Subcategory**: `baby`
- **Authoritative Price**: Rs. 399.00 (Display: Rs. 399)
- **Derived MOQ (Pieces)**: **13 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `blocked_by_quota`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - MEDIA_BLOCKED_BY_QUOTA: Asset generation blocked by upstream Gemini Image API capacity exhaustion (429 RESOURCE_EXHAUSTED).
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `baby-box-1kg-boy` — Action: `proposed_draft`

- **Subcategory**: `baby`
- **Authoritative Price**: Rs. 462.00 (Display: Rs. 462)
- **Derived MOQ (Pieces)**: **11 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `blocked_by_quota`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - MEDIA_BLOCKED_BY_QUOTA: Asset generation blocked by upstream Gemini Image API capacity exhaustion (429 RESOURCE_EXHAUSTED).
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `baby-box-017` — Action: `proposed_draft`

- **Subcategory**: `baby`
- **Authoritative Price**: Rs. 157.50 (Display: Rs. 158)
- **Derived MOQ (Pieces)**: **25 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `deferred`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - VARIABLE_FAMILY_UNVERIFIED_DIMENSIONS: Variable family size tiers lack physical dimensional measurements per size tier.
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `bid-box-acrylic-royal` — Action: `skipped_existing`

- **Status**: Existing Catalog Product (Active)
- **Preservation**: Product "bid-box-acrylic-royal" already exists in live catalog. Existing prices, variants, filled options, and media preserved unchanged.

### `acrylic-box-cube-3in` — Action: `proposed_draft`

- **Subcategory**: `acrylic`
- **Authoritative Price**: Rs. 315.00 (Display: Rs. 315)
- **Derived MOQ (Pieces)**: **16 pieces** (Single box / set)
- **Explicit MOQ Override**: NO (Dynamic rule applies)
- **Media Status**: `approved_draft`
- **Storefront Media Fields**: `image: null`, `imageName: null` (docs/ paths strictly kept outside live storefront)
- **Draft State**: `active: false`, `status: "draft"`
- **Public Visibility Projection**: `isProductPubliclyVisible() === false`
- **Publication Blockers** (2):
  - SUPPLIER_SAMPLE_UNCONFIRMED: Concept render approved; awaiting physical supplier sample and stock receipt confirmation.
  - DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.


### `acrylic-box-sliding-tray-4in` — Action: `excluded_unverified_concept`

- **Status**: Group D Proposed Concept
- **Reason**: Unverified concept "acrylic-box-sliding-tray-4in" excluded from catalog draft creation.

### `acrylic-box-partition-4bay-6in` — Action: `excluded_unverified_concept`

- **Status**: Group D Proposed Concept
- **Reason**: Unverified concept "acrylic-box-partition-4bay-6in" excluded from catalog draft creation.

### `acrylic-box-grand-trousseau-chest` — Action: `excluded_unverified_concept`

- **Status**: Group D Proposed Concept
- **Reason**: Unverified concept "acrylic-box-grand-trousseau-chest" excluded from catalog draft creation.
