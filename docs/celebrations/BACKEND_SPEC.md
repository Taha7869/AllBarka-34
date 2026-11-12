# Backend specification — catalog sections, celebrations and add-ons

12 November 2026 (Asia/Karachi). For any coding agent (Gemini in Antigravity, Codex, Claude). Branch inspected: `claude/celebrations-foundation-20261112`. Status: **SPECIFICATION — nothing in sections 3 to 8 is implemented.** Read `AGENTS.md`, `RULES.md`, `CAUTION.md` and `instructions.md` first; they outrank this file.

## 0. Rules for the agent using this file

1. **Do not write from memory.** Every statement in section 1 was read from the file named beside it. Before changing a file, open it and confirm the statement still holds. If it does not, stop and report the difference; do not adapt silently.
2. **Anything marked UNVERIFIED must be checked in the code before you rely on it.** Record what you found (file and line) in your handoff.
3. **Do not invent** collection names, field names, endpoints, prices, lead times, minimum quantities, materials or customer copy. If a value is not in the repo or in an owner instruction, ask.
4. **Off limits without a separate explicit owner instruction:** prices, shipping, coupons, checkout, order creation, auth, staff roles, server pricing logic (RULES R05), Firestore security rules for existing collections, and any write to the live Firestore project.
5. One phase per commit. For each phase: typecheck, hooks lint, `npm run build`, `node scripts/run-all-tests.mjs`, new tests for the phase, tracker update. State what was not run.
6. All browser access to Firestore stays closed. Reads and writes go through the Express API with the Admin SDK, as they do today.

## 1. What exists today (verified in code on this branch)

| Fact | Where |
|---|---|
| Products live in the Firestore collection `products`; merchandising in `merchandising` (docs `settings`, `preview`) | `src/lib/catalogStore.ts` constants `CATALOG_COLLECTION`, `MERCHANDISING_COLLECTION` |
| Browsers cannot read or write `products`, `inquiries` or `quotes` directly; there is a default-deny rule for every other path | `firestore.rules` |
| Admin product functions: `createAdminProduct`, `updateAdminProduct`, `publishAdminProduct`, `archiveAdminProduct`, `duplicateAdminProduct`, `listAdminProducts`; public catalog through `loadAuthoritativeCatalog` and `mergeAuthoritativeCatalog` | `src/lib/catalogStore.ts`, routes in `src/lib/catalogRouter.ts` |
| A product has one `category` (string), optional `occasions` (string array), optional `packagingSubcategory`, optional `collections` | `Product` in `src/types.ts`; allow-list in `src/lib/catalogSchema.ts` |
| `category` is accepted if it matches `^[a-z0-9_-]{1,80}$`; an empty value silently becomes `dry-fruits`. **It is not checked against the taxonomy** | `src/lib/catalogSchema.ts` |
| `occasions` accepts any non-empty strings; they are not checked against the taxonomy | `src/lib/catalogSchema.ts` |
| `packagingSubcategory` must be one of `tin`, `tabarruk`, `wedding`, `baby`, `acrylic` | `VALID_PACKAGING_SUBCATEGORIES` in `src/lib/catalogSchema.ts` |
| A product appears in a section when `productMatchesCategory` is true: exact `category` match, a `collections` entry, or one of the hard-coded equivalences (nuts/dry-fruits, seeds-snacks/snacks-seeds, dates by name, deals) | `src/config/categories.ts` |
| A product appears under an occasion when `productMatchesOccasion` is true: its `occasions` array after `normalizeOccasionSlug`, else a legacy tag map. `OCCASION_ALIASES` folds many names into five buckets (`wedding`, `umrah`, `ramadan`, `birth`, `corporate`); `hajj` maps to `umrah` | `src/config/categories.ts` |
| Taxonomy is `TaxonomyEntry { id, type: 'category' \| 'collection' \| 'occasion', name_en/ur/ar, description_en/ur/ar, visible }`, at most 150 entries, inside `CatalogConfiguration { version: 1, revision, templates, taxonomy }` | `src/lib/catalogConfiguration.ts` |
| Taxonomy endpoints: `GET /api/catalog/taxonomy` (public), `GET` and `PUT /api/admin/catalog/configuration` (admin, revision-checked) | `src/lib/catalogConfigurationRouter.ts` |
| Enquiries: `POST /api/inquiries`, `POST /api/quotes`, admin list and update under `/api/admin/inquiries` | `src/lib/inquiriesRouter.ts` |
| The occasion enquiry form sends `name, phone, city, eventType, requestedDate, quantity, packagingPreference, includeCard, notes`; `eventType` is one of `wedding, corporate, eid_ramzan, umrah, baby_aqeeqah, majlis_milad` | `src/lib/occasionPlanning.ts`, `src/components/OccasionInquiryModal.tsx` |
| The AI chat route loads the authoritative catalog, removes drafts and archived items, and passes that public catalog to the consultant | `src/lib/aiChatRouter.ts` |
| Celebrations (branches, occasions, ranges, formats, designs) are a **code file**, not Firestore. A design has no price; "Request a quote" opens the occasion enquiry form with the choice written into `notes` | `src/config/celebrations.ts`, `src/pages/CelebrationsPages.tsx` |
| **There is no add-on model anywhere in `src`** (searched for `addOn`, `add-on`, `addons`) | repository search |

UNVERIFIED, check before use:

- U1. Which product fields the consultant actually receives and uses (`src/services/n8nAIConsultant.ts`). In particular whether `category`, `occasions` and `packagingSubcategory` reach the model.
- U2. The Firestore document path where `CatalogConfiguration` is saved (read `src/lib/catalogConfigurationRouter.ts` lines 1 to 50).
- U3. Whether `src/lib/catalogHealthReport.ts` already reports products whose category is not in the taxonomy.
- U4. How `src/components/AdminItemForm.tsx` offers the category today (free text or a list from the configuration).
- U5. Whether `/api/inquiries` stores `notes` unchanged and what length limit it applies.

## 2. Answers to the owner's questions

| Question | Answer today | After this specification |
|---|---|---|
| If I add a product under herbs, does it show in herbs? | Yes, if `category` is exactly the taxonomy id (`herbs-spices`). A typo such as `herbs` is accepted by the server and the product then shows in no section | Phase 3 rejects unknown categories, so a product cannot be saved outside a real section |
| Does a box sub-category work? | Only for celebration packaging, from a fixed list of five | Phase 5 makes sub-categories owner-managed for any category |
| Do occasions join correctly? | Only the five broad buckets are reliable | Phase 4 adds the 56 occasions to the taxonomy and validates product occasions against it |
| Are celebration designs in Firestore? | No. They are in a code file | Phase 6 |
| Are add-ons in Firestore? | No. Nothing exists | Phase 7 |
| Will the AI suggest from the right section? | It receives the public catalog; what it does with category and occasion is U1 | Phase 8 |

## 3. Phase B1 — category integrity (do this first)

Goal: a product can never be saved or published with a category, collection or occasion that the taxonomy does not contain.

- In `createAdminProduct`, `updateAdminProduct` and `publishAdminProduct` (`src/lib/catalogStore.ts`), load the current `CatalogConfiguration` and reject with a clear `CatalogError` code when `category` is not a visible or hidden taxonomy entry of type `category` or `collection`, or when any `occasions` value is not an entry of type `occasion` after `normalizeOccasionSlug`.
- Remove the silent default to `dry-fruits`: a missing category is an error on create and publish.
- Existing products are not rewritten. Add a read-only report (extend `catalogHealthReport.ts` if U3 shows it is the right place) that lists every product whose category or occasions are unknown.
- Admin form: category and occasions are chosen from the configuration, not typed (U4).
- Tests: unknown category rejected on create, update, publish; known category accepted; legacy equivalences in `productMatchesCategory` unchanged; report lists a seeded orphan.

## 4. Phase B2 — occasions in the taxonomy

- Extend `TaxonomyEntry.type` with `'branch' | 'format' | 'range'` and add optional `parent` (id of a `branch` for occasions and ranges, id of a `category` for sub-categories) and optional `signature_en/ur/ar`. Raise the 150-entry limit to 300 and say why in the commit.
- Seed `DEFAULT_CATALOG_CONFIGURATION` from `src/config/celebrations.ts` (10 branches, 56 occasions, 12 ranges, 22 formats). The five existing occasion ids (`wedding`, `umrah`, `ramadan`, `birth`, `corporate`) stay valid; do not rename or delete them, and do not reassign any saved product.
- `src/config/celebrations.ts` keeps its exported functions. Change only where its data comes from: the public taxonomy when it has celebration entries, the constants as fallback. Pages must not change.
- `tests/celebrations-registry.test.ts` must still pass; add a test that the seeded configuration validates.

## 5. Phase B3 — sub-categories

- Add `subcategory?: string` to the product allow-list and `Product` type. Valid only when a taxonomy entry of type `category` exists with `parent` equal to the product's `category`.
- `packagingSubcategory` stays readable as a legacy alias: when present and `subcategory` is absent, treat it as the sub-category. Do not delete the field or change saved data.
- Listing: `/shop/:category?sub=<id>` filters by sub-category through one new helper next to `productMatchesCategory`. No new route.

## 6. Phase B4 — designs in Firestore

- New collection `celebrationDesigns/{designId}` written only by the server. Fields mirror `CelebrationDesign` in `src/config/celebrations.ts`: `slug, name, branch, occasion, range, formats[], palette[], finishes[], imageId, image, gallery[], status, publishApproved`, plus `revision`, `updatedAt`, `updatedBy`.
- Add an explicit `match /celebrationDesigns/{id} { allow read, write: if false; }` rule for clarity; the default-deny already covers it.
- Endpoints, following `catalogConfigurationRouter.ts`: `GET /api/celebrations/designs` returns only `publishApproved` designs and only public fields; admin `GET/PUT/POST` under `/api/admin/celebrations/designs` with the existing admin guard, revision check and an audit record in the existing audit pattern.
- Validation: `occasion`, `branch`, `formats` must exist in the taxonomy; `publishApproved` requires a non-empty `image`; `finishes` must include `standard`.
- Import the 57 designs from the code file once, as unpublished, with a script that prints a dry run first.
- A design never has a price field.

## 7. Phase B5 — add-ons (quote flow only)

- New collection `addOns/{addOnId}`: `id, name_en/ur/ar, kind` (`ribbon`, `card`, `sticker`, `tag`, `bag`, `sleeve`, `foil-upgrade`, `other`), `appliesToFormats[]`, `appliesToBranches[]`, `active`, `quoteOnly: true`, `revision`.
- Public `GET /api/celebrations/add-ons` returns active add-ons. The design page shows the ones that apply; chosen add-ons are added to the enquiry `notes`, exactly as the design, format, finish and quantity are today.
- **No add-on price enters the cart or checkout in this phase.** Priced add-ons at checkout change server pricing and need their own owner instruction under RULES R05.

## 8. Phase B6 — assistant context

- Resolve U1 first. If category, sub-category and occasions do not reach the consultant, add them to the catalog payload it already receives; do not add a second catalog source.
- Give the consultant the published occasion list (plain name, signature name, aliases, route) from the taxonomy, so "bete ke daant ka function hai" resolves to `/occasions/first-tooth`. Unpublished occasions may be named but must be offered as an enquiry, not as stocked products.
- Recommendations stay validated against the public catalog, as `aiChatRouter.ts` already does.
- Tests with fixture messages in English, Urdu and Roman Urdu; no live provider call in tests.

## 9. Order and acceptance

Order: B1, B2, B3, B4, B5, B6. B1 is independent and protects everything after it.

The work is accepted when: a product saved with a wrong category is rejected with a readable error; a product saved under `herbs-spices` appears at `/shop/herbs-spices` and nowhere else unless a collection or occasion says so; every one of the 56 occasions can be attached to a product from the admin form; a published design appears on its occasion and format pages without a code change; an add-on chosen on a design page arrives in the stored enquiry; and the offline suite is green with the new tests.
