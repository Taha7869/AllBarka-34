# Next catalogue batch — parked items

Written 14 November 2026 so nothing agreed in conversation is forgotten. Owner decision on each: add in the **next** batch, after launch.

## 1. Pulses and lentils (daalain)

Not part of the launch catalogue. Add as a new customer-facing category `pulses` (EN "Pulses & Lentils", UR "دالیں"), with sub-collections for lentils, split pulses and whole pulses.

Suggested first list: masoor (whole and split), moong (whole, split and washed), chana dal, mash dal, arhar/toor dal, red and white lobia, kabuli and desi chana, red kidney beans (rajma), green peas, barley (jau), and whole wheat daliya.

Needs: a new entry in `FOOD_CATEGORIES`, navigation and merchandising order, EN/UR/AR labels in `catalogTranslations.ts`, the `murabba-jaat` pattern for aliases, and a draft intake with per-kg reference rates. Pulses are sold by weight, so the existing mg/g/kg engine applies unchanged.

## 2. Other parked items

- Akbari's own masala blends were not copied; AllBarka's own blends (chaat masala, garam masala, chai masala) already exist. Add more only as AllBarka's own recipes.
- Anbar and mushk/kastoori are not listed (see the bundles document). Revisit only with legal advice.
- Kashmiri saffron: revisit if a clear supplier and import route exists.
- Real photographs replace placeholders as they arrive; images and prices are edited from Firestore.
- Re-price bundles after component rates are set (bundle prices do not follow component prices).
- Redeem catalogue design, agent rules and skills (owner points 1, 3 and 4 of 12 November).

Tracked in `docs/PENDING_WORK.md` as CAT-NEXT.
