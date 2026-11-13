# Catalogue reference check against akbarionline.pk — 2026-11-13

Purpose: use a competitor's public catalogue as a **reference** for coverage and sanity-checking, in AllBarka's own wording. Reference rates below were entered at the owner's explicit instruction (13 Nov 2026) as starting points; products stay drafts until the owner publishes them, and live prices are edited from Firestore. No Akbari text or image was copied.

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

## Categories and sub-categories (owner decisions, 13 Nov 2026)

- **Murabba Jaat** is a new top-level category (`murabba-jaat`) with sub-collections `fruit-murabba`, `vegetable-murabba`, `gulkand-and-rose`. It appears in the shop menu, merchandising order and EN/UR/AR labels.
- **Chai & Herbal Teas** sit inside **Herbs & Spices** as the sub-collection `herbal-teas` (also reachable at `/shop/herbal-teas`).
- Other sub-collections used: `kernels-and-nuts`, `dried-fruits`, `premium-dates`, `everyday-dates`, `snack-seeds`, `whole-spices`, `ground-spices`, `herbs-and-leaves`, `gums-and-resins`, `traditional-herbs`, `wellness-oils`, `sweeteners-and-honey`.
- Not added: Daalain / Pulses (no decision yet), Zafran, Anbar, Kastoori, Mushk and Jinsing (authenticity must be verified first), Akbari's own masala blends (their brand), and three Akbari murabbas whose exact nature is unclear (Ashrafi green, Ashrafi red, Bans, Hareer).

## What batch 20261113 contains

65 products: 47 pantry items (including nine more dry fruits added on the owner's request), 7 murabba and 11 teas. Each has a placeholder image, a reference rate, and full copy in EN/UR/AR: what it is and why it matters, how to use it, sourcing (general facts only; exact batch confirmed on request), storage, packing, and allergen note. All are `draft` and `active: false`. Claims about traditional-use items carry “not a medicine” wording and `claimsVerification: unverified`. Arabic needs native review.

Rates are **per kg for solids and per litre for oils**; pack prices are computed exactly (for example Hazelnuts 250 g = PKR 650, Amla Oil 250 ml = PKR 1,125). **Basis A** = akbarionline.pk “From” price scaled to the smallest pack (assumed 250 g, or 500 g for Mazafati); **basis E** = AllBarka estimate where no direct reference was found; **basis P** = press-reported retail rate (Express Tribune, Oct 2024); **basis O** = rate stated by the owner. All rates must be reviewed before publishing; replace each in the admin.

| Product | Category / sub-collection | Reference rate (PKR) | Basis |
|---|---|---|---|
| Hazelnuts (Filbert) | nuts / kernels-and-nuts | 2,600 per kg | A |
| Gurbandi Almonds, Shelled | nuts / kernels-and-nuts | 3,600 per kg | A |
| Gurbandi Almonds, In Shell | nuts / kernels-and-nuts | 1,000 per kg | A |
| Paper-Shell Walnuts (Kagzi Akhroot) | nuts / kernels-and-nuts | 1,000 per kg | A |
| Dry Coconut (Ghari Khopra) | nuts / kernels-and-nuts | 1,600 per kg | A |
| Plain Cashews (Sada Kaju) | nuts / kernels-and-nuts | 3,800 per kg | A |
| Salted Peanuts | snacks-seeds / snack-seeds | 1,600 per kg | A |
| Plain Pistachio Kernels (Pista Giri) | nuts / kernels-and-nuts | 5,000 per kg | A |
| Seedless Dried Apricots | nuts / dried-fruits | 1,600 per kg | A |
| Dried Apricots, Kishta | nuts / dried-fruits | 800 per kg | A |
| Mabroom Dates | dates / premium-dates | 4,500 per kg | A |
| Mazafati Dates | dates / premium-dates | 1,100 per kg | A |
| Piarom Dates | dates / premium-dates | 1,400 per kg | A |
| Rubai Dates | dates / everyday-dates | 1,000 per kg | A |
| Iranian Dates (Irani Khajoor) | dates / everyday-dates | 600 per kg | A |
| Dried Pomegranate Seeds (Anar Dana) | herbs-spices / whole-spices | 760 per kg | A |
| Fenugreek Seeds (Methi Dana) | herbs-spices / whole-spices | 1,200 per kg | A |
| Kalonji (Nigella Seeds) | herbs-spices / whole-spices | 1,000 per kg | A |
| Sunflower Kernels (Hulled) | snacks-seeds / snack-seeds | 1,400 per kg | A |
| Amla Oil | oils / wellness-oils | 4,500 per L | A |
| Coriander Seed Oil | oils / wellness-oils | 4,500 per L | A |
| Desi Gur (Jaggery) | essentials / sweeteners-and-honey | 320 per kg | A |
| Phulai Honey (Wild Acacia) | essentials / sweeteners-and-honey | 2,400 per kg | A |
| Beri (Sidr) Honey | essentials / sweeteners-and-honey | 9,600 per kg | A |
| Turmeric Powder (Haldi) | herbs-spices / ground-spices | 850 per kg | A |
| Black Pepper Powder (Kali Mirch) | herbs-spices / ground-spices | 2,600 per kg | A |
| Long Pepper (Dara Mirch) | herbs-spices / whole-spices | 950 per kg | A |
| Curry Leaves (Kari Patta) | herbs-spices / herbs-and-leaves | 400 per kg | E |
| Dried Oregano | herbs-spices / herbs-and-leaves | 360 per kg | A |
| Desi Dalchini (Cassia Bark) | herbs-spices / whole-spices | 280 per kg | A |
| Isabgol Husk | herbs-spices / traditional-herbs | 2,100 per kg | A |
| Dried Amla | herbs-spices / traditional-herbs | 1,000 per kg | A |
| Dried Shikakai | herbs-spices / traditional-herbs | 800 per kg | A |
| Looban (Frankincense) | herbs-spices / gums-and-resins | 1,000 per kg | A |
| Char Gond (Gum Arabic) | herbs-spices / gums-and-resins | 1,100 per kg | A |
| Salab Misri (Salep) | herbs-spices / traditional-herbs | 38,000 per kg | E |
| Ashwagandha (Asghand Nagori) | herbs-spices / traditional-herbs | 1,800 per kg | A |
| Black Myrobalan (Kali Harar) | herbs-spices / traditional-herbs | 1,400 per kg | A |
| Murabba Amla | murabba-jaat / fruit-murabba | 800 per kg | A |
| Murabba Gajar (Carrot) | murabba-jaat / vegetable-murabba | 500 per kg | A |
| Murabba Saib (Apple) | murabba-jaat / fruit-murabba | 700 per kg | A |
| Murabba Behi (Quince) | murabba-jaat / fruit-murabba | 1,000 per kg | E |
| Murabba Bael | murabba-jaat / fruit-murabba | 900 per kg | E |
| Gulkand (Rose Petal Preserve) | murabba-jaat / gulkand-and-rose | 800 per kg | A |
| Murabba Harad (Myrobalan) | murabba-jaat / fruit-murabba | 1,000 per kg | E |
| Kadak CTC Chai Patti | herbs-spices / herbal-teas | 1,800 per kg | A |
| Green Tea (Sabz Chai) | herbs-spices / herbal-teas | 2,000 per kg | A |
| Peshawari Qehwa (Kahwa) | herbs-spices / herbal-teas | 1,200 per kg | A |
| Kashmiri Kahwa | herbs-spices / herbal-teas | 3,600 per kg | E |
| Kashmiri Noon Chai (Pink Tea) | herbs-spices / herbal-teas | 2,400 per kg | E |
| Chai Masala (Spiced Tea Blend) | herbs-spices / herbal-teas | 2,800 per kg | E |
| Elaichi Chai (Cardamom Tea) | herbs-spices / herbal-teas | 2,400 per kg | E |
| Lemongrass (Lemon Grass Tea) | herbs-spices / herbal-teas | 1,000 per kg | A |
| Chamomile Tea (Babuna) | herbs-spices / herbal-teas | 6,000 per kg | E |
| Jasmine Green Tea (Chinese Tea) | herbs-spices / herbal-teas | 3,200 per kg | E |
| Tulsi Tea (Holy Basil) | herbs-spices / herbal-teas | 1,600 per kg | E |
| California Almonds (American Badam) | nuts / kernels-and-nuts | 3,800 per kg | A |
| Paper-Shell Almonds (Kagzi Badam) | nuts / kernels-and-nuts | 1,900 per kg | P |
| Mamra Almonds | nuts / kernels-and-nuts | 6,500 per kg | E |
| Chilgoza (Pine Nuts), In Shell | nuts / kernels-and-nuts | 10,000 per kg | O |
| Sundarkhani Raisins | nuts / dried-fruits | 1,650 per kg | P |
| Roasted Peanuts, In Shell (Mungphali) | snacks-seeds / snack-seeds | 800 per kg | P |
| Roasted Chana, Skinless | snacks-seeds / snack-seeds | 800 per kg | A |
| Dried Figs, Medium (Anjeer) | nuts / dried-fruits | 3,200 per kg | A |
| Desiccated Coconut (Khopra Burada) | nuts / kernels-and-nuts | 1,800 per kg | E |

Cross-check with press reports: Pakistani retail dry-fruit rates reported in Oct 2025 were walnuts PKR 1,500–2,900/kg, raisins 950–1,350, dried apricots 1,500–2,500 and figs 1,800–3,000, and in Oct 2024 plain cashews PKR 3,400 and pistachios 3,400 per kg. Our existing rates and the new references are in the same broad ranges; they are not a substitute for today’s market check.

## Chilgoza: needs an owner decision

The owner's rate, updated on 13 Nov 2026 from 7,000 to PKR 10,000 per kg, is entered on the new draft **Chilgoza (Pine Nuts), In Shell**. The existing live listing `pine-nuts` (kernels) is PKR 4,500 per 100 g and 11,000 per 250 g in the compiled catalogue, which is PKR 45,000 per kg. It was **not changed**. If 10,000 per kg was meant for that listing, change it in the admin; press reports from Oct 2024 put in-shell chilgoza at PKR 16,000–20,000 per kg, so 10,000 is still below that range and should be re-checked against the current market.

## Batch 20261110 (ChatGPT's 17 drafts) completed

Those 17 drafts had descriptions but no usage, sourcing, storage, packing or allergen copy, and 12 had no rate. `src/data/catalogIntake20261110Overlay.json` now supplies all of it at import time (EN/UR/AR) and a reference rate per 100 g or 100 ml for the 12 (estimates; gachak and rewari follow press rates). The original manifest is untouched. If these 17 already exist in Firestore, the importer skips them and the copy must be pasted in through the admin.

## Units (backend rules, verified by tests)

- Mass units: `mg`, `g`, `kg`. Volume units: `ml`, `L`. They never convert to each other (`INCOMPATIBLE_MEASUREMENT`); 1 kg = 1,000,000 mg and 1 L = 1,000 ml exactly.
- Prices use integer arithmetic from the base rate, rounded half-up to whole PKR. A pack that rounds to PKR 0 (for example 250 mg of a PKR 1,000/kg item) is rejected, so choose a sensible pack size.
- Liquids are valid only in `oils`; label must equal quantity + unit (`250g`, `1kg`, `100ml`, `1L`).

## Import and image replacement

```
npx tsx scripts/import-catalog-intake-20261113.ts                       # offline plan, writes nothing
npx tsx scripts/import-catalog-intake-20261113.ts --read-only --project=<id> --database=<id>
npx tsx scripts/import-catalog-intake-20261113.ts --execute --project=<id> --database=<id> --confirm-project=<id> --actor-uid=<admin uid>
```

Create-only: an existing product is never overwritten. After import, edit each rate and photo in the admin, then publish.

## Sources (retrieved 13 Nov 2026)

- https://akbarionline.pk/ and its category pages: dry-fruits, dates, spices, seeds, herbs, organic-oils, murabba-jaat, herbal-teas, pulses-daalain (listing “From” prices); product pages for Mabroom dates, Mazafati dates, Rubai dates and Saunf (pack sizes and ranges).
- Tribune, “Dry fruits' prices hit record high” (Oct 2025): https://tribune.com.pk/story/2571001/dry-fruits-prices-hit-record-high
- Tribune, “Dry fruits, chicken soup prices skyrocket” (Oct 2024): https://tribune.com.pk/story/2506122/entertainment
- Tea background (noon chai, kahwa): Hamiast, Goodwyn and Samovar product pages; Rai Kashmiri Tea page.
