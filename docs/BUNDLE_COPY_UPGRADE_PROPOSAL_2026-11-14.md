# Earlier bundles and boxes: copy upgrade proposal (14 Nov 2026)

Status: **proposal, nothing changed yet.** These 14 bundles and 8 `bid-box-*` items already exist in the compiled seeds, and Firestore `products` is the live authority. Renaming or rewriting them changes live names that customers and past orders already see, and several tests and translation scripts reference the current names, so the owner approves first.

## What the audit found

1. **Health claims in names and text.** "Immunity Shield", "Brain Fuel Box", "Winter Warrior Pack", "Sustained cognitive focus", "family immunity rituals", "postpartum recovery", "restorative care", `healthTag: PROPHETIC WELLNESS`. The store rule is no medical claims. These are the first thing to remove.
2. **Name does not describe what is inside.** Customers see a brand name and have to open the page to learn the contents.
3. **Contents disagree with the component ids.** `bundle-immunity-shield` and `bundle-ramadan-ready` list "Muzafati dates" in the text but link `ajwa-dates` in `componentIds`. One of the two is wrong.
4. **No quantities.** Only `bundle-daily-grind` ("3 × 250g") says how much of each item is inside.
5. **Placeholder hampers.** Silver, Gold, Platinum, Mystery Box and Tasting Flight say "selections confirmed before dispatch" and link no items, so there is no "What's inside" list.
6. **`bid-box-*` are not in Firestore** (see the launch census note), so they are fail-closed inactive and do not display at all.

## Proposed descriptive names (ids and prices stay as they are)

| id | Today | Proposed English name |
| --- | --- | --- |
| deal-1 | The Classics (Walnut & Pista Duo) | Walnut & Pistachio Duo, 2 × 500 g |
| deal-2 | Work-Day Fuel (Almonds & Cashews) | Almond & Cashew Duo, 2 × 500 g |
| bundle-daily-grind | The Daily Grind | Daily Snack Trio: Almonds, Cashews & Raisins, 3 × 250 g |
| bundle-brain-fuel | Brain Fuel Box | Walnut, Almond, Chia & Pumpkin Seed Box |
| bundle-winter-warrior | Winter Warrior Pack | Traditional Winter Pantry: Gond, Char Maghaz, Panjeeri & Chohara |
| bundle-immunity-shield | Immunity Shield | Kalonji Oil, Dates & Flax Seed Box |
| bundle-sunrise-seeds | Sunrise Seeds | Morning Seed Mix: Chia, Flax, Pumpkin & Sunflower |
| bundle-royal-feast | Royal Feast | Royal Feast: Chilgoza, Panjgur Dates, Figs & Pistachios |
| bundle-ramadan-ready | Ramadan Ready | Ramadan Ready: Two Dates, Figs & Mixed Nuts |

Each description would follow the same shape as the new batch: a short summary, then **What's inside** (item, quantity, its everyday role) and **Why this set**, with no claim beyond taste, tradition and use.

## How to apply (after the owner agrees)

1. Owner confirms the names above, and which date variety is really inside Immunity Shield and Ramadan Ready (audit point 3).
2. Edit the seeds and the live Firestore documents through the admin (or an owner-approved, create-or-update script with `--dry-run` first; it must not touch price or stock).
3. Re-run `tests/catalog-render.test.tsx` and `tests/catalog-expansion.test.ts`, which mention the current names.
