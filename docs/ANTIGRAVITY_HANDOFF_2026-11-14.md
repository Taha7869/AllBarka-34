# Handoff to the coding agent (Antigravity) — 14 November 2026

Read this first, then `docs/celebrations/BACKEND_SPEC.md` (its section 0 rules apply to everything below), `docs/PENDING_WORK.md` and `docs/LAUNCH_READINESS_2026-11-13.md`.

## State

- Branch `claude/celebrations-foundation-20261112` (latest commit on origin). No pull request exists, hosted CI has never run on it, nothing is deployed. `launch` and `main` are both at `5e63490` (22 October).
- Compiled catalogue: 97 products. Drafts in the repository: **123** in three create-only batches (`20261110`: 17, `20261113`: 65, `20261114`: 41). Live Firestore count: **unmeasured**.
- Local gates passed on the last run: `tsc --noEmit`, `npm run lint:hooks`, `npm run build` (with the privacy audit), `node scripts/run-all-tests.mjs` (113 test files, 36 production checks). Restore evidence afterwards: `git checkout -- docs/evidence/error-surfaces`.
- Tooling: Node 24 (`/opt/node24/bin` in the cloud workspace), run TypeScript with `node --import tsx --test <file>`.

## Rules that do not change

Do not change prices, shipping, checkout, order creation, auth, staff roles, server pricing logic, existing Firestore rules, or write to the live Firestore project without a separate explicit owner instruction. Products stay `draft` and `active: false` until the owner publishes them. Never use `set` or merge to import; the importers are create-only through `createAdminProduct`.

## Tasks in order

1. **Open the pull request and get hosted CI green.** Open a PR from this branch into the launch line (confirm the target with the owner: `launch` or `main`). Fix anything hosted CI finds that local runs did not. Do not merge without the owner.
2. **Phase B1 of the backend spec (category integrity).** Implement as written in section 3 of `BACKEND_SPEC.md`, one phase per commit, with its tests.
   - The importers go through `createAdminProduct`, so after B1 they are validated against the taxonomy. The drafts use exactly these values, which must exist in the taxonomy first:
     - categories: bundles, dates, dry-fruits, essentials, herbs-spices, murabba-jaat, nuts, oils, snacks-seeds
     - collections: combos, deals, dried-fruits, everyday-dates, fruit-murabba, ground-spices, gulkand-and-rose, gums-and-resins, herbal-teas, herbs-and-leaves, kernels-and-nuts, premium-dates, saunf, snack-seeds, sweeteners-and-honey, traditional-herbs, traditional-sweets, vegetable-murabba, wellness-oils, whole-spices
     - occasions: birth, corporate, ramadan, umrah, wedding
   - If the saved taxonomy document does not contain `murabba-jaat` and the sub-collections above, add them through the admin configuration path, not by editing Firestore by hand. Report the diff.
3. **Measure the live catalogue before any import.** Run `npx tsx scripts/count-live-catalog.ts --project=<id> --database=<id>` (read-only) with the owner's approved target. Record the total, the per-state and per-category counts, products the repository does not know about, and any id that collides with a draft. Stop and report if there is a collision.
4. **Import the drafts, in this order, only after tasks 2 and 3 and the owner's go-ahead.** Each script takes `--project --database --confirm-project --actor-uid` for `--execute`, and prints an offline plan with no flags.
   1. `scripts/import-catalog-intake-20261110.ts`
   2. `scripts/import-catalog-intake-20261113.ts`
   3. `scripts/import-catalog-intake-20261114.ts` (bundles reference the earlier drafts as components)
   After each run, rerun with `--read-only` and confirm every item is `SKIP_EXISTING`.
5. **Publishing is the owner's step.** A bundle may be published only after its draft components. `docs/catalog/MASTER_INTAKE_REGISTER.csv` has `publish_these_drafts_first` and `owner_action_before_publish` for every row. Do not publish on the owner's behalf.
6. **Remaining backend phases B2 to B6** from `BACKEND_SPEC.md`, in order, each as its own commit.

## Known facts to carry forward

- Bundle prices are fixed values computed from component reference rates (`bundlePricing` in `src/data/catalogIntake20261114.json`, reproducible with `src/lib/bundleReferencePricing.ts`). They do not follow component prices. If component rates change, the bundles need re-pricing.
- Live oil seeds carry placeholder-looking prices (same price for different sizes); see the bundles document.
- `componentIds` is now kept by `validateDynamicProduct`; a stored bundle can link to its components and `BundleContentsSummary` can render them.
- Arabic copy in the drafts and in the celebrations registry has not had a native review.
- Parked work is in `docs/ROADMAP_NEXT_BATCH.md` (pulses and others).

## Owner-side items (not for the coding agent)

Real photographs, final rates, supplier papers (shilajit purification and heavy-metal report, saffron origin and grade), the chilgoza decision on the live `pine-nuts` item, Arabic review, and publishing each product.
