# Quick View → full details — verification

10 November 2026. Technical blockB from the owner's parallel-work plan. Source parent inspected: e754e9fc3960a54526a4579cfdbb67ad24c744df. This report does not certify launch readiness or live provider operation.

## Changed behavior

Quick View's explicit Full details link carries only canonical variant and integer quantity as URL hints. PDP resolves them against current catalog availability, pricing, packaging min pack units and existing quantity limits. It restores the selection after reload. Invalid/removed/disabled hints produce a localized EN/UR/AR review notice and current defaults. Prices and product objects never travel in the link; no automatic add-to-cart occurs.

The PDP now stores the canonical variant label instead of a positional index, so catalog key reordering cannot silently change the selected portion. Route initialization resolves the destination default and its MOQ together. A catalog refresh that raises the minimum and clamps the current quantity prompts review. Existing custom/inquiry behavior, quote authority, sticky gallery, card styles and callbacks remain in place. Quick View no longer offers explicitly disabled variants.

## Scope and truthful limits

This fixes Quick View → full-details continuity, not primary card → Quick View continuity. The latter is a separate remaining integration item. No existing97-product source/rate file, pending intake JSON, catalog import, production database, provider secret, security rule or deployment is changed. The two previously prepared catalog assertions remain outside this commit. No new dependency.

## Local results

- Typecheck: PASS (`npm run typecheck`).
- Hooks lint: PASS (`npm run lint:hooks`).
- Production build and release privacy audit: PASS (`npm run build`;85 text artifacts). Existing large-chunk warning remains; no performance score is claimed.
- Focused selection/media/custom-weight/packaging-MOQ/filled-gift/cart-input suite:86 PASS,0 FAIL,0 skipped across7 files.
- Fourteen new helper cases cover encoding, eligible variants, strict/duplicate/malformed hints, quantity bounds, pack-vs-piece minimums, current price/MOQ changes, reorder and removed/disabled labels.
- Actual SSR checks cover restored500g×4 at current catalog price despite a supplied fake price query, disabled Quick View options and media continuity.
- Browser fixture bundles successfully but cannot launch here: Playwright reports missing executable `chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`. The local browser attempt is not a pass. The failed fixture process was stopped after its launch failure left its test server open. No screenshot or visual approval is claimed from that attempt.

Reproduce focused checks:

```sh
node --import tsx --test --test-isolation=none tests/product-detail-handoff.test.ts tests/product-media-render.test.tsx tests/product-selection.test.tsx tests/custom-weight.test.ts tests/stage3-pricing-moq.test.ts tests/filled-gift-pricing.test.ts tests/cart-input.test.ts
```

## Hosted gate required

The existing complete offline CI installs the locked Chromium and runs all tests, backend, asset and production checks. The extended real-browser PDP fixture includes Quick View500g×3 → details → reload → cart, manual edits, a reordered refreshed catalog, stale variant and invalid quantity, alongside the existing24 width/language/theme combinations and packaging/fallback checks. Those new browser assertions are pending hosted execution at report creation; do not reuse a previous commit's green status as their result.

Inspect the checks for the exact result commit in [draft PR17](https://github.com/Taha7869/AllBarka-34/pull/17). Any later hosted result must identify its tested SHA/run separately. AntiGravity's visual branch/report is still pending owner execution; [runnable task](ANTIGRAVITY_HOME_VISUAL_BLOCK_2026-11-10.md).
