# AllBarka celebrations — Style Bible

## Owner amendments, 12 November 2026 (these override any conflicting line below)

1. **Surface.** Warm honed travertine or ivory limestone with a soft warm-ivory wall, matching the storefront's travertine shelf and ivory palette. Light stays neutral daylight with no amber cast. The warm-grey tabletop is retired.
2. **Open formats.** Baskets, crates, trays, bottle sets and open drawers are shown closed, wrapped, or lined with plain unprinted tissue so they do not look bare. Still no food, liquid or contents claim.
3. **Label face.** The labelled face is turned no more than about 15 degrees from the camera and evenly lit, so a real typeset sample name can be composited later ("lettering pass"). No AI-rendered text of any kind.
4. **Framing.** Every card image must also survive a centred 1:1 crop with the whole object visible.
5. **Finishes.** Two print tiers exist because the owner prints through market suppliers: **standard print** (default, lower cost) and **gold foil** (higher cost, quoted separately). Batch 1 images show standard print. Foil variants are allowed only for Wedding, Hajj and Umrah designs, as one restrained hot-foil accent, in a later batch; the manifest records which images show foil.
6. **Who generates.** The owner generates images in Gemini (Nano Banana Pro) or another tool from [GEMINI_PROMPT_PACK.md](GEMINI_PROMPT_PACK.md); the manifest remains the record.


Batch 0 · Draft for owner approval · 12 November 2026 (Asia/Karachi)

No images may be generated and no page code may be written until the owner approves the changed naming rows, this document and the ten Batch 1 manifest rows. Saving this proposal is not creative approval. [Naming register](NAMING_REGISTER.md) · [Image manifest](IMAGE_MANIFEST.md) · [Coverage tracker](../CELEBRATIONS_COVERAGE_TRACKER.md).

## 1. Photography that stays consistent

- Natural window daylight, neutral white balance around 5000–5600 K, soft directional shadows with visible contact beneath each object. No amber/sepia cast, artificial glow, dramatic spotlights or floating packaging.
- Matte warm-grey tabletop, approximately #E7E4DE; quiet off-white background, approximately #F3F1EC. These are photographic references, not compulsory product colours. Preserve actual white/cream separation and readable material edges.
- Optional pale unpolished stone or plain off-white linen only where it helps show the product. No busy marble veins, glitter, heavy props or decorative clutter. Keep the same surface/light within a design's three views.
- Natural perspective, approximately 50–85 mm equivalent for angled views. No wide-angle distortion. The entire product remains visible, with roughly 10–15% clear margin; lighting shows paper grain, metal seams, acrylic edges, fabric weave and wood grain without over-sharpening.
- Each design has its own palette, illustration and typography direction. Only the photography and website frame are consistent. Do not recolour all packaging emerald/gold. Gold-coloured CMYK ink must not look like metallic foil.

## 2. Three shot types

| Shot token | Purpose | Composition | Aspect | Web output |
|---|---|---|---|---|
| card | Product/design card and detail cover | One main package or a single matching packaged unit; three-quarter view; large readable product | 4:5 | 1280 × 1600 px |
| top-down | Show layout, lid, inserts and construction | Orthographic overhead; open/closed pieces only where requested; same design/materials as the approved card | 1:1 | 1600 × 1600 px |
| set | Complete the set | Group only the explicitly planned matching accessories; each object separated and recognizable | 4:3 | 1600 × 1200 px |

No collage/contact sheet may replace a deliverable. No crop may cut off the package or imply unseen extra contents. A bottle-set card may show its carrier and the specific empty containers listed in its brief. A card for a presentation-set range may show the small coordinated paper set; it does not become a food-filled hamper.

## 3. Realism and production feasibility

- Packaging must be plausible using ordinary card stock, paperboard, available tins, acrylic sheets, wood, woven baskets or fabric. State materials as proposed construction in the internal brief; a render is not supplier verification.
- Use visible, possible folds, hinge clearances, lid thickness, glued seams, handles and joins. No floating handles, merged lids, impossible tabs, unrealistically thin wood/acrylic or transparent metal.
- Plain stock packaging may carry full-colour matte printed stickers, labels or sleeves. Full-colour illustrative art is welcome. No moulded sculptures, unexplained custom metalwork, exaggerated embossing or expensive finishes masquerading as ordinary print.
- Match insert sizes to the containers; nothing intersects or clips through another object. Lids must fit the same base. Keep construction and proportions identical across the card, top-down and set shots.
- Physical size and capacity stay unclaimed until measured/confirmed. Do not infer grams, bottle volume, food safety or contents from a render. Empty packaging is the default in Batch 1; no food, liquid, tasbih, cosmetics or other unlisted inclusions.
- Keep faces out. No hands for these three default shots; a hand requires a separately approved scale-shot brief. No other-brand logos or trademarks. No religious depictions, sacred text, holy-site silhouettes or symbols unless the specific approved brief requests them. Batch 1 requests none.

## 4. Text and labels

- Never generate Urdu or Arabic script in imagery.
- Batch 1 uses no Latin text, numbers, initials, pseudo-writing, logos or watermarks either. Later approved briefs may specify one short Latin placeholder, but no required product text should depend on generated lettering.
- Leave the designated printed-name/label panels deliberately blank and large enough for later typesetting. Floral, geometric or illustrative art may surround them; avoid random glyph-like marks.
- Real names, brand lettering, quantity, contact details and EN/UR/AR text come from editable print files later. A generated WebP is not a press-ready file. Customer-facing images must never imply that a print-production service step has already been verified.
- Every image remains a design concept until the owner confirms a physical sample. The website's visible “Design concept” caption comes from data, never baked into the picture. Public concept display requires its own explicit publication state; private drafts are not exposed.
- Printing proof is NOT confirmed. Do not add promises about proofs or customer approval before printing to any customer copy.

## 5. Reusable prompt template

Replace every slot before adding the exact expanded prompt to the manifest. Once generated, preserve the text actually used; a changed retry prompt belongs to its own recorded attempt.

```text
Create one photorealistic packaging design concept for AllBarka. Design: {design}. Occasion/use: {occasion_or_range}. Format: {format}. Proposed construction: {construction}. Palette and artwork: {palette_and_artwork}. Shot: {shot_type_and_camera}. Aspect: {aspect}. Show only: {objects}; all packaging is empty. Use neutral natural window daylight, soft contact shadows, a warm honed travertine surface and a soft warm-ivory wall. Show believable material texture, seams, thickness and fitted parts; normal matte printed labels or sleeves only. Keep the full objects visible with clear margin and realistic proportions. Leave {label_areas} clean and blank for later typesetting. No text, glyphs, numbers, logos, watermarks, people, faces, hands, food, liquids, religious symbols or unlisted props. Avoid impossible folds, intersecting objects, plastic-looking paper, amber colour cast and CGI gloss. Keep the design palette accurate. This is a concept rendering, not a manufactured-product claim.
```

For top-down/set follow-ups, inspect and reference the selected card image; lock its artwork, geometry and colours. Add the actual reference file/version to the manifest notes before generating. A set shot cannot silently invent additional product formats.

## 6. Batches and checkpoints

- Batch 0 is this documentation/approval packet. No product images.
- Batch 1 is the owner's explicit ten-image breadth exception: one representative card for each of ten branches. It remains one logical batch; it may be processed in two five-image runs, not two newly limited collections. Batch 2 is ten matching set shots, with individually planned accessory lists approved beforehand. All later normal batches contain 6–8 images, one branch where possible.
- All ten Batch 1 rows are TODO and pushed before any generation. Do not treat draft prompts as approved. Before each later batch, write and push its rows first.
- Before an image, read this file and its manifest row. After each image, inspect construction, correct format, label areas, text artifacts and aspect. Check correct colours and objects as well. Record pass/fail notes immediately.
- On failure: retain the original row as REJECTED with the reason; allow one corrected generation. Give the retry a new IMG ID, parent ID, exact revised prompt and versioned target (v2); preserve the rejected record. If the second attempt fails, flag it and move to the next planned original row. Never replace a failed brief with another design.
- TODO means not generated. GENERATED means output exists and QA/result notes are recorded but is not yet committed. REJECTED means a failed attempt. COMMITTED means a QA-passed web asset is present in a pushed git commit; this does not mean manufactured, published or owner-approved.
- Save web-ready WebP only in git, long edge exactly 1600 px, target under 250 KB (250,000 bytes). Do not commit PNG originals. Resizing/encoding must preserve composition, material detail and the correct aspect. If the size budget cannot be met without visible damage, flag the exception; do not silently lower visual quality.
- Initial assets use public/images/celebrations/<occasion>/<design>/<plural-format>-<shot>-v1.webp. The accessories branch has no invented occasion: use the documented shared directory bucket. Later revisions use v2/v3 and keep the prior accepted version until the owner selects a replacement.
- Each completed batch is one commit and immediate push; image-only gates are build/privacy audit and an asset audit that also covers the new manifest assets (the old catalog script alone covers only its existing product list). Report exact commit/CI state, completed IDs and RESUME AT.
- A manifest cannot contain its own commit hash. Record each asset's containing commit SHA in the next metadata checkpoint; until then say “pending SHA backfill; see git log -- <target>”. Never invent a self-referential hash. Before any next generation session, backfill these SHAs from git. The external push report always includes the actual full hash.
- If refused/rate-limited: stop generation immediately; preserve completed work, QA notes and next unfinished ID; run applicable checks, commit/push the checkpoint, report one line, then move to the approved code queue. Do not regenerate through another provider or degrade quality. The current approval gate overrides this fallback: no page code before approval.
- Resume after any interruption: fetch current branch, open IMAGE_MANIFEST.md, verify its approval gate and RESUME AT, inspect git log and files, then continue. Neither elapsed time nor an existing TODO row is approval.

## 7. Customer publication gate

An occasion is public/indexable only after at least one finished, publication-approved design is assigned. Until then the hub offers “Request this occasion”; its direct URL serves the enquiry page with noindex and stays out of the sitemap. This does not force a stock claim: a published finished concept still displays its concept caption and uses enquiry when unpriced. Pages must handle zero images without broken images, placeholder product claims or empty grids.

## 8. Approval record

- Changed naming rows: awaiting final yes.
- Style Bible: awaiting approval.
- Ten Batch 1 briefs and intended palettes/formats: awaiting approval.
- Arabic: every string needs native review; no reviewer or sign-off recorded.
- Physical samples: none confirmed for this new batch.
- Printing proof service: not confirmed; omitted from customer promises.
