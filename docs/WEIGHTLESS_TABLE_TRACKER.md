# Pending work tracker — storefront experience ("The Weightless Table")

Single list of what is left. Plan and reasoning: [blueprint](STOREFRONT_EXPERIENCE_BLUEPRINT_2026-11-12.md). Homepage work already done: [HOME-LG1/LG2 record](HOME_LIVING_GALLERY_2026-11-11.md).

**Branch:** `claude/home-approved-20261111` (PR #18). Integration target after final review: PR #17. Last updated: 11 November 2026, head `13bc436`.

**How to update (any agent or the owner):** change only the Status and Evidence cells, keep the IDs, add the commit SHA when a row becomes DONE, and update "Last updated" above. Status values: `TODO`, `IN_PROGRESS`, `BLOCKED` (say on what), `DONE`, `DROPPED` (say why). A row is DONE only when its commit is pushed and the gates in RULES R08 passed.

Rough progress: about 15% done, 85% remaining (estimate).

## A. Owner decisions

| ID | Decision | Status |
|---|---|---|
| WT-D1 | Approve "The Weightless Table" direction and signature layer (replaces the still-life hero brief) | TODO |
| WT-D2 | Approve or replace the Urdu section words: دسترخوان, ذخیرہ, تحفہ | TODO |
| WT-D3 | Approve or replace the three "Rise" lines: "Chosen for your table." / "Portioned the way you order." / "Wrapped to be given." | TODO |
| WT-D4 | Ask AllBarka: keep as a separate button or move into the search field | TODO |
| WT-D5 | Cleanup audit decisions ([audit](CLEANUP_AUDIT_2026-11-11.md)); separate review | TODO |

## B. Owner media (prompts were supplied in chat on 11 November; specs in blueprint section 6)

| ID | Asset | Tool | Status |
|---|---|---|---|
| WT-M1 | Image A: desktop hero with nuts in the air (16:9) | Nano Banana Pro | TODO |
| WT-M2 | Image B: mobile hero with nuts in the air (9:16) | Nano Banana Pro | TODO |
| WT-M3 | Image C: gift box full (16:9) | Nano Banana Pro | TODO |
| WT-M4 | Image D: gift box empty, nuts floating above (16:9) | Nano Banana Pro | TODO |
| WT-M5 | Clip 1D: Float loop, desktop, 8 s | Flow | TODO |
| WT-M6 | Clip 1M: Float loop, mobile, 8 s | Flow | TODO |
| WT-M7 | Clip 2D: Rise, desktop, 8 s, steady speed | Flow | BLOCKED on WT-M1 |
| WT-M8 | Clip 2M: Rise, mobile, 8 s, steady speed | Flow | BLOCKED on WT-M2 |
| WT-M9 | Clip 3: Gather, 8 s, steady speed | Flow | BLOCKED on WT-M3, WT-M4 |
| WT-M10 | Saunf & Mouth Fresheners collection photo (1:1) | Nano Banana Pro | TODO |
| WT-M11 | Urdu/Arabic names for "Saunf & Mouth Fresheners" and "Dates" collections | Owner or agent | TODO |

## C. Build

| ID | Phase | Work | Status | Evidence |
|---|---|---|---|---|
| WT-00 | 0 | Homepage base: emerald hero with new stills, Ask AllBarka, travertine shelf, large-photo cards, ivory Gift Atelier | DONE | `9f77686`, hosted CI run 43066816555 |
| WT-01 | 1 | Motion grammar tokens (Lift, Settle, Draw, Gather) and three warm shadow levels | BLOCKED on WT-D1 | |
| WT-02 | 1 | Brass thread: one scroll-drawn gold line through the homepage | BLOCKED on WT-D1 | |
| WT-03 | 1 | Two-script section headings (EN with Urdu Nastaliq word; reversed in UR/AR) | BLOCKED on WT-D1, WT-D2 | |
| WT-04 | 1 | Card and tile lift; fly-to-bag on Add to Bag | BLOCKED on WT-D1 | |
| WT-05 | 1 | Condensing header and route cross-fade | BLOCKED on WT-D1 | |
| WT-06 | 2 | Hero Float loop with pause control and matching posters | BLOCKED on WT-M5, WT-M6 | |
| WT-07 | 2 | "Lit like Lahore" time-of-day hero grading | BLOCKED on WT-D1 | |
| WT-08 | 2 | "The Rise" pinned frame sequence, desktop and mobile | BLOCKED on WT-M7, WT-M8, WT-D3 | |
| WT-09 | 2 | First-visit opening (1.2 s, once per session, skippable) | BLOCKED on WT-02 | |
| WT-10 | 3 | Gift Atelier "Gather" frame sequence | BLOCKED on WT-M9 | |
| WT-11 | 3 | Gifting page header using the Gather sequence | BLOCKED on WT-M9 | |
| WT-12 | 3 | Gift reveal page: ribbon untie, note writes itself, contents rise | BLOCKED on WT-D1 | |
| WT-13 | 4 | Shop: slim header band, same card language, mobile filter sheet | BLOCKED on WT-D1 | |
| WT-14 | 4 | Product page: larger gallery, pack-size "weight you can feel", pointer depth | BLOCKED on WT-D1 | |
| WT-15 | 4 | Product page origin line (only where origin data exists) | BLOCKED on WT-D1 | |
| WT-16 | 4 | Saunf collection tile image and collection name translations | BLOCKED on WT-M10, WT-M11 | |
| WT-17 | 5 | Mobile bottom bar (search, Ask AllBarka, bag) and press-and-hold Quick View | BLOCKED on WT-D1 | |
| WT-18 | 5 | Cart: large-photo line items, pinned mobile summary | BLOCKED on WT-D1 | |
| WT-19 | 5 | Checkout: clearer progress and inputs, no decorative motion | BLOCKED on WT-D1 | |
| WT-20 | 5 | Order success, journal, info, policies, FAQ typography pass | BLOCKED on WT-D1 | |
| WT-21 | 6 | Measure and record media budgets (blueprint section 6) | TODO after phases 2–3 | |
| WT-22 | 6 | Accessibility pass: keyboard, 200% zoom, reduced motion, screen reader | TODO after phase 5 | |
| WT-23 | 6 | Real-phone check by the owner, including a live Ask AllBarka answer | TODO | |
| WT-24 | 7 | Final review, then integrate into PR #17 | TODO | |

## D. Separate from this plan

| ID | Item | Status |
|---|---|---|
| CLEAN-AUDIT-02 | Apply approved cleanup rows as its own commit and log them in `trash.md`; keep the four screenshots named by the recovery manifest and fix `RENOVATION_HANDOFF.md` archive links | BLOCKED on WT-D5 |
| HERO-FILM-OLD | Old `signature-table-*` films and posters kept as rollback; remove only after WT-06 is accepted | TODO |
