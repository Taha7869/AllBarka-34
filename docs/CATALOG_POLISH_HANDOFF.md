# Catalog polish progress

Branch: `codex/master-catalog-polish-20261004`, based on latest main `a6494d2`.
The actual catalog has 89 products: 32 established selections and 57 additions.
Prices, portions, categories, names and canonical pricing are preserved.

- Phase 1 complete: invalid custom weights show an em dash; purchase stays disabled. Nearest valid step is an explicit choice. Eligible 1kg/5kg shortcuts use canonical weight validation. Full offline suite passed (42 test files, backend, asset and 47 production checks). Browser interaction passed for empty, 4999g, 99g, 5050g, correction and both shortcuts.
- Phase 2 complete: 57 additions have localized origin tags; named regions are used only where supported by the name, otherwise Pakistan packing is stated. Both card layouts use the same origin field as category/search/wishlist and comparison views.
- Phase 3 in progress: Herbs & Spices/saffron (20), dry fruits/nuts/essentials (26), snacks/seeds (13), oils (15) have specific localized care content. Remaining: bundles and established duos.
- Phase 4 pending: refined SVGs and second gallery images.
- Phase 5 pending: final data guardrails, TypeScript, full verification and PR summary.

No merge or deployment is part of this task.
