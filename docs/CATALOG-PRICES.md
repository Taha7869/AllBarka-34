# AllBarka catalogue and owner price editing

The catalogue source is `src/data/products.ts`. Its first line marks the owner-editable price file. This file owns all fixed retail portions, separate custom-weight rates, product metadata and shipping billing weights. The legacy `prices` record and new `variants` array are generated from the same definition; do not maintain a second price table.

The 73 requested entries produce **57 new products**, with **32 existing products preserved**, for **89 products total**. Equivalent existing items and the repeated Char Maghaz request are reused. Different date varieties, walnut origins, golden versus green raisins, raw versus roasted cashews and masala almonds remain distinct products.

| Category | Existing | New | Total |
| --- | ---: | ---: | ---: |
| Dry fruits & nuts (`nuts`) | 8 | 14 | 22 |
| Existing gift duos (`gift-boxes`) | 2 | 0 | 2 |
| Snacks & seeds (`snacks-seeds`) | 4 | 9 | 13 |
| Cold-pressed oils (`oils`) | 13 | 2 | 15 |
| Existing essentials (`essentials`) | 5 | 0 | 5 |
| Herbs & spices (`herbs-spices`) | 0 | 19 | 19 |
| Deals & bundles (`bundles`) | 0 | 13 | 13 |
| **Total** | **32** | **57** | **89** |

## Reused catalogue entries

These requested entries reuse the established SKU, photo and existing fixed prices. An overlapping placeholder price never overwrites an established price.

| Requested selection | Canonical product ID | Added missing size, if any |
| --- | --- | --- |
| Iranian saffron | `org-saffron` | 2g — Rs. 1,250 |
| Panjiri mix | `org-panjeeri` | 250g — Rs. 900 |
| Hunza dried apricots | `khubani` | None |
| Prunes / dried plums | `alubukhara` | None |
| Green long raisins | `kishmish` | None; existing description already specifies long green raisins |
| Chia seeds | `chia_seeds` | 100g — Rs. 350 |
| Pumpkin seeds | `pumpkin_seeds` | 100g — Rs. 500 |
| Char Maghaz seeds combo | `char-maghaz-mix` | Reuses the new four-pack mix listed under nuts |
| Black seed oil | `oil-blackseed` | None |
| Castor oil | `oil-castor` | None |
| Walnut oil | `oil-walnut` | None |
| Coconut oil | `oil-coconut` | None |
| Extra virgin olive oil | `oil-olive` | 500ml — Rs. 2,800 |
| Sesame oil | `oil-sesame` | 250ml — Rs. 700 |
| Flaxseed oil | `oil-flaxseed` | None |
| Apricot kernel oil | `oil-apricot` | None |

The brief lists the same four-pack Char Maghaz selection twice at Rs. 1,200 and Rs. 1,100. One product is created, using the first listed placeholder of Rs. 1,200. The owner should confirm its final price in this file; the duplicate entry is not offered at a contradictory second price.

## Editing prices and custom weights

- Existing products keep their fixed `prices` records. Update those records in this file; the compatible `variants` array is generated from them.
- New products have owner-editable `variants` tuples in the `ADDITIONS` list. Change a tuple's price; both runtime `variants` and legacy `prices` derive from that tuple.
- Custom pricing is separately owner-editable: `EXISTING_CUSTOM_RATES` for established loose selections, and `pricePer100g` on each new definition. Initial rates use the smallest canonical loose portion normalized to 100g. A later fixed-price edit does not silently change the custom rate.
- Loose dry selections allow 100g–5,000g custom weights, in 50g steps. The commerce engine rounds the custom price upward to the next Rs. 5.
- Oils, fixed bundles, Char Maghaz four-packs, saffron, honey and ghee have no custom-weight option.
- New entries do not invent wholesale discounts: their `wholesale` compatibility field is zero, while their declared retail variants remain available.
- `corporate-gifting` is quote only. It has no purchase variants and no price; its contact action must not place a zero-price cart item.

## Editing bundle shipping weights

Shipping metadata uses actual declared portions. Dry grams/kilograms and four-packs are derived from their canonical labels. Oil tariff billing preserves the owner's numeric convention: 1ml is billed as 1g; this is not a physical density claim.

Each purchasable new bundle defines `shippingWeightG` in `src/data/products.ts`. These are owner-provided placeholder packed weights, including packaging; edit the field manually to update courier billing. The shipping engine uses this value ahead of any older per-portion `shippingWeights` entry. Quantities multiply the packed weight, and mixed carts add all canonical weights before applying Rs. 250/kg with a Rs. 250 nationwide minimum. No rounding up to whole kilograms occurs.

| Bundle | `shippingWeightG` |
| --- | ---: |
| The Daily Grind | 900 |
| Brain Fuel Box | 1100 |
| Winter Warrior Pack | 1500 |
| Immunity Shield | 800 |
| Sunrise Seeds | 800 |
| Royal Feast | 2500 |
| Silver Hamper | 1500 |
| Gold Hamper | 2500 |
| Platinum Hamper | 4000 |
| Ramadan Ready | 2000 |
| Mystery Box | 1200 |
| Tasting Flight | 500 |

Both established 500g + 500g gift duos retain 1,000g shipping billing weight. Char Maghaz's four 100g packs retain 400g. Corporate Gifting remains quote only, has no shipping weight, and cannot enter checkout. Invalid or missing bundle weights still block nationwide pricing rather than inventing a mass.

Silver, Gold, Platinum, Mystery, Ramadan mixed nuts and Tasting Flight have partially unspecified selections. Their descriptions state that selections are confirmed before dispatch; their `componentIds` list only specifically identified products.

## Product media

New products have `image: null` and render a neutral branded placeholder. Existing product photographs and galleries remain unchanged. Product photography is a separate future task.

`tests/catalog-expansion.test.ts` verifies counts, preserved existing prices and photographs, compatible variants, localized names, custom-weight eligibility, declared shipping metadata and null media on new products. Custom-weight arithmetic and API/cart rejection cases are covered by the shared commerce-engine tests.
