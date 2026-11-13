# Bundles, deals, ready-made occasion boxes and premium items — 14 November 2026

Batch `owner-intake-20261114`: **59 create-only drafts** (52 bundles, deals and boxes; 7 premium pantry items). File: `src/data/catalogIntake20261114.json`. Importer: `scripts/import-catalog-intake-20261114.ts` (same flags and safety as the earlier batches). Tests: `tests/catalog-intake-20261114.test.ts`.

Every product is `status: draft`, `active: false`, with a placeholder image, full EN/UR/AR copy and `claimsVerification: unverified`. Nothing is published, and no existing product or price was changed.

## How bundle prices are set

Each bundle lists its components with exact quantities. The price is **component value × (1 − discount) + packaging fee**, using the reference rate of every component at the time of writing, rounded to PKR 50. Deals round **down** so the saving on the badge is always real (the test recomputes it and fails if a deal costs more than its parts). Themed sets and gift boxes make no saving claim; a gift box's price includes its presentation box. The full working for every bundle (each component, rate and line value) is in `bundlePricing` inside the manifest.

**Bundle prices do not follow component prices automatically.** When you change a component's rate in Firestore, change the bundles that contain it too. The register (`docs/catalog/MASTER_INTAKE_REGISTER.csv`) lists the components of each bundle.

## Publish order matters

A bundle may be published only after its components are. The register column `publish_these_drafts_first` names the draft components of every bundle (live seeds need no action). Components with a weak rate basis (estimates) make the bundle price weak too: check the register before publishing a bundle.

## Occasion coverage

Each of the five occasions the storefront filters on has ready-made boxes: Ramadan & Eid (Iftar Table, Suhoor Table, Family Reserve, Eid Munh Meetha), Nikkah & Wedding (Chuhara & Nuts, Mehndi Snack Box, Walima Favour Box, Dawat Mukhwas), Umrah & Hajj (Returning Pilgrim Tabarruk Box), Birth & Aqeeqah (Welcome Baby, Post-Birth Pantry), Corporate (Appreciation Box, Executive Crate, Office Desk Box). They are filled boxes with a fixed price. The existing empty and filled bid boxes, and quote-only custom work, are unchanged and still available.

### Deals (priced below the parts, saving stated)

| Product | Occasion | Parts value | Price | Packed weight |
|---|---|---:|---:|---:|
| Almond, Cashew & Walnut Trio (`deal-nut-trio`) | Everyday | 2,175 | 2,000 | 900 g |
| Khajoor & Badam Pair (`deal-date-almond`) | Ramadan & Eid | 1,500 | 1,400 | 900 g |
| Chai Time Deal (`deal-chai-time`) | Everyday | 1,015 | 950 | 1,000 g |
| Family Dry Fruit Saver, 2 kg (`deal-family-2kg`) | Ramadan & Eid | 5,962 | 5,450 | 2,250 g |
| Evening Snack Saver (`deal-evening-snack`) | Everyday | 1,775 | 1,600 | 1,950 g |
| Honey Duo (`deal-honey-duo`) | Everyday | 1,950 | 1,800 | 1,250 g |
| Murabba Duo (`deal-murabba-duo`) | Everyday | 750 | 700 | 1,250 g |
| Whole Spice Kitchen Kit (`deal-whole-spice-kit`) | Everyday | 2,450 | 2,300 | 650 g |
| Hair Oil Ritual Set (`deal-hair-oil-set`) | Everyday | 2,550 | 2,350 | 650 g |
| Monthly Family Pantry Box (`bundle-monthly-pantry`) | Everyday | 3,170 | 3,000 | 3,250 g |

### Themed sets (no saving claimed)

| Product | Occasion | Parts value | Price | Packed weight |
|---|---|---:|---:|---:|
| Sardi Special Winter Box (`bundle-sardi-special`) | Everyday | 3,810 | 3,700 | 2,300 g |
| Pakistani Chai Journey (`bundle-chai-journey`) | Everyday | 1,060 | 1,100 | 900 g |
| Herbal Tea Garden Set (`bundle-herbal-tea-garden`) | Everyday | 920 | 1,000 | 800 g |
| Murabba Tasting Collection (`bundle-murabba-tasting`) | Everyday | 950 | 1,000 | 1,850 g |
| Honey Connoisseur Trio (`bundle-honey-trio`) | Everyday | 3,375 | 3,300 | 1,200 g |
| Khajoor Journey Date Tasting Box (`bundle-khajoor-journey`) | Ramadan & Eid | 2,600 | 2,600 | 1,750 g |
| Dawat Mukhwas Set (`bundle-dawat-mukhwas`) | Nikkah & Wedding | 800 | 900 | 1,000 g |
| Office Desk Snack Box (`bundle-office-desk`) | Corporate | 3,550 | 3,500 | 1,200 g |
| Pure Oil Discovery Set (`bundle-pure-oil-discovery`) | Everyday | 2,800 | 2,800 | 700 g |
| Iftar Table Box (`bundle-iftar-table`) | Ramadan & Eid | 4,375 | 4,250 | 1,950 g |
| Suhoor Table Box (`bundle-suhoor-table`) | Ramadan & Eid | 2,235 | 2,250 | 1,500 g |
| Ramadan Family Reserve (`bundle-ramadan-family-reserve`) | Ramadan & Eid | 7,238 | 6,800 | 4,450 g |
| Eid Munh Meetha Box (`bundle-eid-munh-meetha`) | Ramadan & Eid | 808 | 900 | 1,200 g |
| Mehndi & Dholki Snack Box (`bundle-mehndi-snack-night`) | Nikkah & Wedding | 3,920 | 3,850 | 2,700 g |
| Traditional Post-Birth Pantry Box (`bundle-post-birth-pantry`) | Birth & Aqeeqah | 3,290 | 3,250 | 1,550 g |

### Gift boxes (price includes the presentation box)

| Product | Occasion | Parts value | Price | Packed weight |
|---|---|---:|---:|---:|
| Gourmet Nut Reserve (`bundle-gourmet-nut-reserve`) | Corporate, Nikkah & Wedding | 4,475 | 4,700 | 1,500 g |
| Chilgoza Heirloom Box (`bundle-chilgoza-heirloom`) | Corporate, Nikkah & Wedding | 12,900 | 13,500 | 1,150 g |
| Zafran & Royal Kernels Box (`bundle-zafran-royal`) | Corporate, Nikkah & Wedding | 7,675 | 8,300 | 1,250 g |
| Returning Pilgrim Tabarruk Box (`bundle-umrah-tabarruk-ready`) | Umrah & Hajj | 4,112 | 4,350 | 1,700 g |
| Nikkah Chuhara & Nuts Box (`bundle-nikkah-chuhara`) | Nikkah & Wedding | 4,550 | 4,800 | 2,000 g |
| Walima Thank-You Favour Box (`bundle-walima-favour`) | Nikkah & Wedding | 1,405 | 1,650 | 650 g |
| Welcome Baby Box (`bundle-welcome-baby`) | Birth & Aqeeqah | 4,970 | 5,100 | 1,550 g |
| Corporate Appreciation Box (`bundle-corporate-appreciation`) | Corporate | 3,512 | 3,800 | 1,500 g |
| Executive Dry Fruit Crate, 5 kg (`bundle-executive-crate`) | Corporate, Nikkah & Wedding | 18,025 | 18,200 | 5,900 g |

## Premium pantry items

| Product | Category | Reference rate | Basis |
|---|---|---:|---|
| Afghan Saffron, Negin Grade (Zafran) (`saffron-afghan-negin`) | herbs-spices | PKR 1,200,000/kg | Pakistani online retail range PKR 999 to 1,800 per gram (Organic Aprico listing, 2026); indicative only |
| Spanish Saffron, Coupe Grade (Zafran) (`saffron-spanish-coupe`) | herbs-spices | PKR 1,800,000/kg | Top of the Pakistani online retail range, PKR 1,800 per gram (Organic Aprico listing, 2026), with the 20-30% premium commonly quoted for Spanish saffron; indicative only |
| Gilgit-Baltistan Shilajit Resin (Salajeet) (`shilajit-gilgit-resin`) | herbs-spices | PKR 100,000/kg | Pakistani online retail PKR 1,000 per 10 g and 4,500 per 50 g (Organic Aprico listing); a 2026 guide quotes PKR 75,000 to 150,000 per kg; indicative only |
| Korean Red Ginseng Roots (Panax Ginseng) (`korean-red-ginseng-root`) | herbs-spices | PKR 45,000/kg | AllBarka estimate; no verified Pakistani retail rate found. Owner to set from the supplier quote |
| Mulethi, Licorice Root Sticks (`mulethi-licorice-root`) | herbs-spices | PKR 1,000/kg | AllBarka estimate from market range; no direct reference found |
| Safawi Dates, Madinah (Safawi Khajoor) (`dates-safawi`) | dates | PKR 2,400/kg | AllBarka estimate from market range; no direct reference found |
| Sukkari Dates, Al-Qassim (Sukkari Khajoor) (`dates-sukkari`) | dates | PKR 2,000/kg | AllBarka estimate from market range; no direct reference found |

### Owner checks before publishing these

- **Shilajit:** the copy says a batch is offered only with its purification and heavy-metal report. Do not publish without that report. It is a traditional food product with an adults-only note, not a medicine.
- **Saffron (both):** confirm origin and grade from the supplier's batch papers. Publish the Spanish Coupe item only if the papers say Spanish origin and Coupe grade.
- **Korean red ginseng:** the rate is an estimate; set it from a supplier quote.
- **Mulethi:** the copy carries a blood-pressure note for regular heavy use.
- **Safawi and Sukkari dates:** rates are estimates; confirm origin and crop year.

## Not added, deliberately

- **Ambergris (anbar) and musk (mushk, kastoori):** natural musk comes from musk deer, which are protected under CITES, and its trade is restricted or illegal in most places; ambergris has its own legal and authenticity questions and is not a food. Both are also the items where fakes are most common. Not added; a lawyer's or customs advice is needed before either is listed. Plant-based attars are a separate perfume line, not a food item.
- **Kashmiri saffron:** not added because of cross-border trade uncertainty.

## Backend fixes that came with this batch

- `componentIds` was being discarded when a dynamic product was validated, so a stored bundle could not link to its components. It is now kept (plain catalogue ids, at most 30).
- The intake enrichment now keeps preset packing and allergen lines, so bundles carry allergens computed from their components.

## Rates noted on live seeds (not changed)

Several live oil seeds carry the same price for different bottle sizes (for example `oil-sesame` is 700 for both 100 ml and 250 ml, and many oils are 700 per 100 ml). These look like placeholders. The hair-oil and oil-discovery sets use the smallest bottle price, so they will need a re-price once the oil rates are set.


## Update 14 November (later): descriptive names and the visit range

- Every bundle name now lists what is inside and its weight (for example "Almond, Cashew & Walnut Trio, 750 g").
- Each bundle description has three parts: a summary, **What's inside** (each item, its quantity and its everyday role) and **Why this set**. All three languages. No health claims.
- 18 new drafts for visiting and hosting, collection `visit-gifts`: hospital and get-well baskets (five sizes from PKR 1,000 to about 5,300), small, classic and premium host gifts, a mithai box, a dawat host gift, a rishta visit box, new home, thank-you, teacher, Eid visit, visiting parents, condolence visit and a 2.1 kg family hamper.
- Get-well boxes carry a care note: ask the family about any diet the patient has been given before choosing items.
- The condolence box is the most sensitive item in the range. Keep it, rename it or drop it as you decide.
- The product page now shows a **What's inside** list with a photo, a link and the exact quantity for each component.
- Earlier seed bundles are not changed here; see [the copy upgrade proposal](BUNDLE_COPY_UPGRADE_PROPOSAL_2026-11-14.md).
