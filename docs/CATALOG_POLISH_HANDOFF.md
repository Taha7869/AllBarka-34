# Catalog polish progress

Branch: `codex/master-catalog-polish-20261004`, based on latest main `a6494d2`.
The actual catalog has 89 products: 32 established selections and 57 additions.
Prices, portions, categories, names and canonical pricing are preserved.

- Phase 1 complete: invalid custom weights show an em dash; purchase stays disabled. Nearest valid step is an explicit choice. Eligible 1kg/5kg shortcuts use canonical weight validation. Full offline suite passed (42 test files, backend, asset and 47 production checks). Browser interaction passed for empty, 4999g, 99g, 5050g, correction and both shortcuts.
- Phase 2 pending: origin tags and card parity.
- Phase 3 pending: localized, specific care content in category batches.
- Phase 4 pending: refined SVGs and second gallery images.
- Phase 5 pending: final data guardrails, TypeScript, full verification and PR summary.

No merge or deployment is part of this task.
