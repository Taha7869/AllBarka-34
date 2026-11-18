# Live Firestore Catalog Census (Post-Held AI Batch 1 Publish) — 2026-11-20

Census taken immediately after publishing 13 newly AI-photographed items (`/images/held-ai-20261120/<id>.webp`) into live Firestore (`allbarka-live` / `(default)`), leaving 20 items on hold in `docs/catalog/IMAGE_HOLD_20261119.txt`.

---

## 1. Executive Summary

| Metric | Count | Details |
|---|---|---|
| **Total Products in Live Firestore** | **252** | Full master catalog persisted in Firestore |
| **Active / Published** | **232** | Up from 219 (+13 AI-photographed items); newly published items carry `priceIndicative: true` |
| **Hidden Drafts on Hold** | **20** | Remaining items awaiting AI image generation (`status: 'draft'`, `active: false`) |
| **Archived / Inactive** | **0** | None |
| **Live IDs Not in Repo** | **0** | 100% matched with repository records |
| **Repo Items Missing Live** | **0** | 0 items missing from Firestore |

---

## 2. Live Breakdown by Category

| Category | Published | Draft (Held) | Total Live | Notes |
|---|---|---|---|---|
| `bundles` | 59 | 6 | **65** | +2 published (`gift-visit-small`, `gift-visit-hospital-light`); 6 remaining on hold |
| `herbs-spices` | 57 | 6 | **63** | +5 published (`ashwagandha`, `dried-shikakai`, `korean-red-ginseng-root`, `mulethi-licorice-root`, `saffron-spanish-coupe`) |
| `nuts` | 36 | 4 | **40** | +2 published (`pecans`, `almond-slices`) |
| `oils` | 22 | 0 | **22** | 100% published |
| `snacks-seeds` | 21 | 1 | **22** | `salted-peanuts` remaining on hold |
| `dates` | 11 | 0 | **11** | 100% published |
| `celebration-boxes` | 8 | 0 | **8** | 100% published |
| `essentials` | 8 | 0 | **8** | 100% published |
| `murabba-jaat` | 4 | 3 | **7** | +4 published (`murabba-amla`, `murabba-bael`, `murabba-behi`, `gulkand`); 3 remaining on hold |
| `dry-fruits` | 4 | 0 | **4** | 100% published |
| `gift-boxes` | 2 | 0 | **2** | 100% published |
| **Total** | **232** | **20** | **252** | **100% repo parity** |

---

## 3. Newly Published 13 Items (AI Studio Photos)

All 13 updated via canonical admin update + publish transactions (`rev 3`, `priceIndicative: true`, audit entries in `catalogAudits`):

1. `pecans` → `/images/held-ai-20261120/pecans.webp`
2. `almond-slices` → `/images/held-ai-20261120/almond-slices.webp`
3. `murabba-amla` → `/images/held-ai-20261120/murabba-amla.webp`
4. `murabba-bael` → `/images/held-ai-20261120/murabba-bael.webp`
5. `murabba-behi` → `/images/held-ai-20261120/murabba-behi.webp`
6. `gulkand` → `/images/held-ai-20261120/gulkand.webp`
7. `mulethi-licorice-root` → `/images/held-ai-20261120/mulethi-licorice-root.webp`
8. `saffron-spanish-coupe` → `/images/held-ai-20261120/saffron-spanish-coupe.webp`
9. `ashwagandha` → `/images/held-ai-20261120/ashwagandha.webp`
10. `dried-shikakai` → `/images/held-ai-20261120/dried-shikakai.webp`
11. `korean-red-ginseng-root` → `/images/held-ai-20261120/korean-red-ginseng-root.webp`
12. `gift-visit-small` → `/images/held-ai-20261120/gift-visit-small.webp`
13. `gift-visit-hospital-light` → `/images/held-ai-20261120/gift-visit-hospital-light.webp`

---

## 4. Remaining 20 Items on Hold (`docs/catalog/IMAGE_HOLD_20261119.txt`)

- **Nuts (4):** `brazil-nuts`, `gurbandi-almonds-inshell`, `kagzi-almonds-inshell`, `macadamia-nuts`
- **Snacks (1):** `salted-peanuts`
- **Herbs / Spices / Tea (6):** `dadar-mirch-dry-red-chilli`, `salab-misri`, `kamarkas`, `imli-tamarind`, `chamomile-tea`, `coriander-seeds-whole`
- **Murabba (3):** `murabba-gajar`, `murabba-harad`, `murabba-saib`
- **Bundles / Gifts / Deals (6):** `gift-condolence-visit`, `gift-ayadat-basket`, `deal-date-almond`, `bundle-chilgoza-heirloom`, `bundle-murabba-tasting`, `deal-murabba-duo`
