# Catalogue reference check against akbarionline.pk — 2026-11-13

Purpose: use a competitor's public catalogue as a **reference** for coverage and sanity-checking, in AllBarka's own wording. Nothing here changes a live price (RULES R05). No Akbari text or image was copied.

## What could and could not be verified

- Listing pages show only a **“From” price** (the smallest pack) and no pack size. Only the `saunf` product page states its sizes (250 g / 500 g / 1 kg) and its price range (PKR 200–700, three variants).
- Page 2 of Dry Fruits and Spices, and all “Load more” results, are not reachable from this workspace. Counts below are therefore a **lower bound**.
- So the comparison below is **indicative only**. It assumes “From” is the 250 g pack. Where the smallest pack could be 100 g or 50 g (spices, herbs), the assumption is unreliable and those rows are omitted.
- Our rates may be deliberately premium. This table flags differences for the owner; it does not say which side is right.

## Indicative price comparison (owner to decide, nothing applied)

| Our product | Closest Akbari item | Akbari “From” (PKR) | Our rate (PKR/kg, from pricePer100g) | Akbari implied PKR/kg if “From” = 250 g |
|---|---|---|---|---|
| Almonds (our Golden Mountain Badam) | American Almonds, large | 950 | 3,800 | ≈3,800 |
| Cashews (our Luxury King Kaju) | Sada Kaju, big | 1,150 | 3,800 | ≈4,600 |
| Pistachio (our Roasted Iranian Pista) | Plain Pista without shell | 1,250 | 5,000 | ≈5,000 |
| Apricot (our Sun-Dried Khubani) | Gol Khubani | 350 | 1,100 | ≈1,400 |
| Fig (our Afghan Dried Figs) | Anjeer, large | 1,000 | 6,000 | ≈4,000 |
| Green raisin (our Kishmish) | Desi Kishmish Gol | 360 | 1,460 | ≈1,440 |
| Ajwa dates (our Ajwa Madina) | Ajwa Dates | 1,100 | 7,200 | ≈4,400 |
| Flax seeds (our Alsi) | Alsi (Flaxseed) | 150 | 1,000 | ≈600 |
| Sunflower seeds (ours) | Sunflower Seeds | 200 | 1,400 | ≈800 |
| Fennel (our Saunf) | Desi Saunf | 200 (250 g, confirmed on product page) | 1,800 | ≈800 |

Largest gaps to review first: **Afghan figs, Ajwa dates, Fennel, Flax, Sunflower**. Almonds, pistachio and green raisins line up closely.

## Coverage found on Akbari and what was done

| Akbari category | Seen | Action |
|---|---|---|
| Dry Fruits (24 on page 1) | hazelnut, gurbandi almond (shelled/in shell), kagzi walnut, dry coconut, sada kaju, salted peanuts, pistachio kernels, seedless / kishta apricots | **Added as drafts** (batch 20261113) |
| Dates (7) | Mabroom, Mazafati, Piarom, Rubai, Irani | **Added as drafts** |
| Spices (24 of 44) | turmeric, black pepper powder, long pepper, curry leaves, oregano, desi dalchini, gur | **Added as drafts** (their own “Akbari … Masala” blends are their brand and are not copied) |
| Seeds (15) | anar dana, methi dana, kalonji, sunflower kernels | **Added as drafts**; others already exist (chia, flax, pumpkin, sesame, watermelon, basil, melon) |
| Herbs (24 on page 1) | isabgol, amla, shikakai, looban, char gond, salab misri, ashwagandha, kali harar | **Added as drafts**; gond katira, jujube and rose petals already exist |
| Organic Oils (7) | amla oil, coriander seed oil, phulai honey | **Added as drafts**; others already exist |
| Herbal Teas (5), Murabba Jaat (8), Daalain / Pulses (5) | not in AllBarka’s taxonomy | **Not added.** Needs an owner decision on new categories (BACKEND_SPEC phase B2). Honey from the tea page (beri/sidr) was added under essentials. |
| Herbs sub-pages (zafron, anbar, kastoori, mushk, jinsing) | high-value, claim-sensitive | **Not added.** Authenticity claims must be verified first. |

## What batch 20261113 contains

38 products, all `status: draft`, `active: false`, `quoteOnly: true`, **no price**, image `/images/product-placeholder.svg`. They are invisible to customers until the owner (1) sets a rate in the admin, (2) uploads a photo, (3) publishes.

Descriptions are original, short and factual. Items with traditional-use wording (isabgol, amla, ashwagandha, kali harar, shikakai, salab misri, sidr honey) carry “not a medicine / consult a clinician / verified before listing” text and `claimsVerification: unverified`. Arabic needs native review.

## Units (backend rules, verified by tests)

- Mass units: `mg`, `g`, `kg`. Volume units: `ml`, `L`. They never convert to each other (`INCOMPATIBLE_MEASUREMENT`); 1 kg = 1,000,000 mg and 1 L = 1,000 ml exactly.
- Prices are computed with integer arithmetic from the base rate and rounded half-up to whole PKR. Example: 250 mg of a PKR 1,000/kg item = PKR 0.25, which rounds to 0 and is rejected as `INVALID_CALCULATED_PRICE`, so a pack must be priced at a sensible size.
- Liquids (`kind: liquid`) are only valid in `oils`. Solids are only valid in mg/g/kg.
- Label rule: label must equal quantity + unit (`250g`, `1kg`, `100ml`, `1L`). Tests enforce this for all 38 products.

## Import and image replacement

```
npx tsx scripts/import-catalog-intake-20261113.ts                       # offline plan, writes nothing
npx tsx scripts/import-catalog-intake-20261113.ts --read-only --project=<id> --database=<id>
npx tsx scripts/import-catalog-intake-20261113.ts --execute --project=<id> --database=<id> --confirm-project=<id> --actor-uid=<admin uid>
```

Create-only: an existing product is never overwritten. To replace a placeholder, upload the photo in the admin item form or change `image` and `imageName`; the placeholder path is only a draft default.

## Sources (retrieved 2026-11-13)

- https://akbarionline.pk/ (navigation and sample products)
- https://akbarionline.pk/product-category/dry-fruits/ , /dates/ , /spices/ , /seeds/ , /herbs/ , /organic-oils/ , /murabba-jaat/ , /herbal-teas/ , /pulses-daalain/
- https://akbarionline.pk/product/saunf-fennel-seeds/ (only page with stated pack sizes and price range)
