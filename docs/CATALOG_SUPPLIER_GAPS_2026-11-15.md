# Supplier-list gaps: batch 20261115 (15 Nov 2026)

The owner's supplier price list (Taj-e-Meva, Akbari Mandi) has 77 distinct items. Matched by name against the repository: 35 were already website seeds, 13 were already drafts, and 29 were missing. This batch adds the 16 the owner chose.

| Section | Added (draft) |
| --- | --- |
| Spices & masalay | Red chilli powder, whole dry red chillies (dadar mirch), whole coriander, coriander powder, whole white pepper (safaid mirch), kamarkas, tamarind (imli), whole garam masala |
| Dry fruits | Kandahari dried plums (qandhari aloobukhara), Mission figs, dried blueberries, dried kiwi |
| Nuts | Macadamia, brazil nuts, pecans, almond slices |

- File: `src/data/catalogIntake20261115.json`. Importer: `scripts/import-catalog-intake-20261115.ts` (same flags as the earlier batches; create-only, offline plan by default). Tests: `tests/catalog-intake-20261115.test.ts`.
- Every rate is a **placeholder estimate**. The owner sets the real price in the admin before publishing.
- Not added yet (owner to decide or explain): Abdul Wahidi almonds (whole and kernels), roasted almond kernels, jumbo and medium in-shell walnuts, cashew bits, mixed dry fruits, zard chobi, kala mewa, kalmi, Chinese/Sundarkhani/Qandhari mewa.

The full list of every product the repository knows (website seeds and all four draft batches, 254 rows) is `docs/catalog/MASTER_PRODUCT_LIST.csv`, regenerated with `npx tsx scripts/export-master-list.ts`.
