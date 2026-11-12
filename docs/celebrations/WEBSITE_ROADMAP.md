# Celebrations on the website — what exists and what is left

12 November 2026 (Asia/Karachi). Branch `claude/celebrations-foundation-20261112`, built on `codex/storefront-assets-polish-20261112` @ `da5a540`. Status: storefront foundation IMPLEMENTED and locally verified; not merged, not deployed. Names: [NAMING_REGISTER.md](NAMING_REGISTER.md). Images: [IMAGE_MANIFEST.md](IMAGE_MANIFEST.md), [GEMINI_PROMPT_PACK.md](GEMINI_PROMPT_PACK.md).

## 1. What is built (CEL-WEB1)

| Piece | Where | Behaviour |
|---|---|---|
| Registry | `src/config/celebrations.ts` | 10 branches, 56 occasions, 12 ranges, 22 formats and the 10 Batch 1 designs, with EN/UR/AR names from the register. A test fails if it drifts from the register |
| Occasions hub | `/occasions` | All branches and occasions, signature name with the plain name, a "Ready to order now" strip to the five existing listings, and the Shop by occasion / Shop by packaging switch |
| Occasion page | `/occasions/:slug` | Approved design present: designs grid. No approved design: enquiry page with `noindex`. Slugs that already sell today (wedding, mehndi, umrah, ramadan and the rest) keep their existing listing, with a short note naming the new occasion |
| Packaging hub and format | `/packaging`, `/packaging/:format` | Formats and accessories; a format with no approved design is an enquiry page with `noindex` |
| Design page | `/designs/:slug` | Image, occasion, formats, print finish (standard, or gold foil quoted separately), palette, "I want this design" and "Personalise" through the existing enquiry form |
| Redirects | same routes | Old slugs, spellings and signature names go to the plain-name address (`/occasions/pehla-moti` to `/occasions/first-tooth`, `/packaging/tin` to `/packaging/tins`) |
| Search-engine metadata | `src/lib/routeDocument.ts` | Hubs indexable; unpublished occasion, format and design pages `noindex`. `/occasions` previously answered as "Page Not Found" to crawlers; it now has a real title |
| Owner preview | add `?preview=concepts` | Shows unpublished designs on that page only, marked "Not published", always `noindex` |

No price, shipping, coupon, checkout, auth, admin or server pricing code changed. No new dependency.

## 2. How an image goes live

1. Generate the image from the prompt pack and save the WebP at the manifest's target path.
2. In `src/config/celebrations.ts`, set that design's `image` to the path.
3. Check it with `?preview=concepts`.
4. When the owner accepts it, set `publishApproved: true`. The occasion and format pages switch from enquiry to designs by themselves, and become indexable.

A test refuses a design that is published without an image.

## 3. Decisions made here (owner can overturn)

- **Selling links are not replaced.** While an occasion has no approved design, its existing ready-to-order listing stays at the same address.
- **Names come from a code file for now.** The pages read one module, so an admin-managed source can replace it later without touching pages. Admin editing is not built.
- **Foil is a finish, not a separate design.** Every design offers standard print; Wedding, Hajj and Umrah designs also offer gold foil, shown as "quoted separately".
- **Stories are not shown yet.** The one-line story for each name exists only in Roman Urdu; it needs EN/UR/AR text before it appears.

## 3a. Added later on 12 November (CEL-WEB1b)

- **Design page is now a product-style page**: gallery, packaging and print-finish choice, quantity, event date, label text, "Request a quote" that opens the enquiry form with the choice already written in, an "About this design" block, the three ordering steps and more designs from the same collection.
- **Every occasion has a design slot**: 57 designs in the registry (10 from Batch 1, 47 drafted briefs), each tied to a manifest row and a ready prompt in [PROMPT_PACK_BATCHES_3-11.md](PROMPT_PACK_BATCHES_3-11.md).
- **Backend work is specified, not built**: [BACKEND_SPEC.md](BACKEND_SPEC.md).

## 4. What is left

| ID | Work | Needs |
|---|---|---|
| CEL-IMG1 | Batch 1 look test (IMG-0001, IMG-0004), then the other eight | Owner generates in Gemini |
| CEL-IMG2 | Batch 2 set shots; foil variants; lettering pass with real fonts on the blank labels | Batch 1 accepted |
| CEL-WEB2 | "Packaging" entry in the header and mobile menu; homepage entry to the hub | Owner yes on placement |
| CEL-WEB3 | Search by signature name, plain name, Urdu and Roman-Urdu spellings; Ask AllBarka routing to occasion pages | Nothing |
| CEL-WEB4 | "Complete the set" on a design, budget filter, guests-to-pieces helper, occasion finder, season rail | Designs and real prices |
| CEL-WEB5 | Stories in three languages; friendlier breadcrumbs on the new pages | Copy approval |
| CEL-WEB6 | Enquiry form options for birthdays, family, school and accessories (today those branches use the contact page) | Owner decision on form fields |
| CEL-BE1 to CEL-BE6 | Backend phases B1 to B6: category integrity, occasions in taxonomy, sub-categories, designs in Firestore, add-ons in the quote flow, assistant context | [BACKEND_SPEC.md](BACKEND_SPEC.md); B1 can start now |
| CEL-IMG3 | Owner review of the 47 drafted briefs, then Batches 3 to 11 | Batch 1 accepted |
| CEL-AR1 | Native review of every Arabic name and interface string | A native speaker |
| CEL-SEO1 | Add published occasion and design pages to the sitemap as they go live | First published design |
