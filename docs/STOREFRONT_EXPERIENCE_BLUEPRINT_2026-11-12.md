# AllBarka storefront experience blueprint — "The Weightless Table"

Prepared 11 November 2026 (night) for work starting 12 November. Status: **PROPOSAL, owner approval pending.** Nothing in this document is implemented yet. Branch: `claude/home-approved-20261111` @ `fdef5f1`.

This replaces the "calm, locked still-life" hero brief in `ALLBARKA_FINAL_HOME_HANDOFF_2026-11-11.md` only if the owner approves it; until then that handoff stays the accepted direction.

## 1. What the research says

| Finding | Source | What it means for AllBarka |
|---|---|---|
| 2026 e-commerce design has split into luxury restraint (Bottega Veneta, Aesop) and loud challenger brands; the middle ground is where brands lose | [Toimi, best e-commerce designs 2026](https://toimi.pro/blog/best-ecommerce-website-designs/) | Pick one side. AllBarka is a gifting and pantry boutique: restraint everywhere, with a small number of cinematic moments |
| Apple's product pages are the reference for scroll storytelling: one continuous movement through a fixed frame, driven by scroll | same | One pinned scroll sequence per page at most, not effects on every section |
| Scrubbing a `<video>` by scroll stutters, worst on iOS Safari, because seeking depends on keyframes; frames drawn to a canvas are instant in every browser | [Scrollsequence](https://beta.scrollsequence.com/blog/video-on-scroll-why-scrubbing-stutters-mp4-vs-image-sequence), [Scrollhaus](https://scrollhaus.ai/blog/image-sequence-scroll-animation-canvas/) | The AI clips are converted to WebP frame sequences. The clips themselves are only used for looping playback |
| Frame sequences must be budgeted: separate lighter mobile set, canvas pixel ratio capped at 2, draw only when the frame changes | same, plus [Internet Toolbox](https://internettoolbox.it/guides/scroll-animation-frames/) | Budgets in section 6 |
| Aceternity UI: 100+ animated React components installed one at a time with the shadcn CLI; they depend on `motion` | [Aceternity AI recommendations](https://ui.aceternity.com/ai-recommendations) | Compatible with this repo (React 19, Tailwind 4, `motion` 12). Six of them are already in `src/components/ui` |
| Watermelon UI: open-source registry on Tailwind and Radix, 600+ components, still in beta | [Luca Berton](https://lucaberton.com/blog/four-ui-ai-tools-2026/) | Useful for plain building blocks (sheets, filters); not a source of brand character |
| MotionSites: a paid library of prompts for AI site builders, mostly video-background hero sections | [ChatGate overview](https://chatgate.ai/post/motionsites) | Inspiration for hero video treatment only. It sells prompts, not code we can install; no purchase needed |

Stack facts checked in the repo: React 19.2, React Router 7, Tailwind 4.3, `motion` 12.40, GSAP 3.15 (ScrollTrigger included), Embla carousel. **No new dependency is required for anything below.**

## 2. The idea

**The Weightless Table.** Good dry fruit is light, fresh and generous; a gift lifts someone's day. One visual idea carries the whole site: things lift. Nuts rise from the platter, cards rise under the finger, the product you add rises into the bag, and in the gift section everything settles into the box.

Rules that keep it premium rather than gimmicky:

1. Three cinematic moments on the homepage, one per inner page at most. Everything else is quiet.
2. Motion always answers the visitor (scroll, hover, tap) except the single hero loop.
3. Emerald, gold, ivory, Playfair and Inter stay exactly as they are. No sparkles, meteors, beams, globes or glassmorphism.
4. Text is never baked into video. All copy stays live, translated and selectable.
5. Reduced motion, slow connections and old phones get the stills, which already look finished.

## 3. Homepage, top to bottom

| # | Section | Desktop | Mobile | Motion |
|---|---|---|---|---|
| 1 | Hero "Float" | Current emerald hero; a dozen nuts hover above the platter | Portrait version, subject in the lower half | Looping film (clip 1D/1M), pause control, poster fallback |
| 2 | "The Rise" | Pinned for about 2.5 screens: the nuts lift off the platter into the air while three short lines change beside them | Same, portrait frames, about 2 screens | Scroll-driven frame sequence (clip 2D/2M) |
| 3 | Discovery bar | Search, mic, Ask AllBarka, guide (as built) | As built | None |
| 4 | Collections shelf | Travertine shelf, round tiles (as built); centre tile lifts 8px with a deeper shadow | Swipe | Hover/drag only |
| 5 | Boutique Selections | Large-photo cards (as built); card lifts on hover; Add to Bag sends a small copy of the photo up into the bag icon | Tap feedback, same fly-to-bag | On action only |
| 6 | Gift Atelier "Gather" | Pinned for about 2 screens: floating nuts settle into the open gift box, then the two actions appear | Not pinned; the sequence plays inside the photo frame as it scrolls past | Scroll-driven frame sequence (clip 3) |
| 7 | Occasions, care, reviews, FAQ | As built, one shared fade-in for headings | As built | Existing |
| 8 | Emerald footer | As built | As built | None |

Copy for the three "Rise" lines must stay inside approved claims. Proposed (EN; UR/AR to be written with them): "Chosen for your table." / "Portioned the way you order." / "Wrapped to be given." Owner to confirm or replace.

## 4. The rest of the site

| Page | Change | Signature detail |
|---|---|---|
| Shop | Emerald header becomes a slim band with a collection still; filters become a bottom sheet on mobile; same card language as the homepage | Cards lift; nothing pinned |
| Product page | Bigger gallery with thumbnail rail on desktop and swipe dots on mobile; sticky buy box stays; pack-size chips larger | Main photo drifts a few pixels with the pointer (desktop only) |
| Gifting / celebration boxes | Opens with the "Gather" sequence as a short header, then the builder | One sequence |
| Cart | Line items in the large-photo style; delivery summary pinned at the bottom on mobile | Removed items slide away |
| Checkout | No decorative motion. Clear three-step progress, larger inputs, visible totals | Only progress and validation feedback |
| Order success | Gift box still with a single gold line drawing in | One load animation |
| Journal, info, policies, FAQ | Typography pass only | Reading progress line (Tracing Beam, already in repo) |
| Global | Header condenses after the hero; soft cross-fade between routes; one focus style | View transitions where supported |

Prices, shipping rules, coupons, cart, checkout logic, auth, admin and server code are out of scope for every phase.

## 5. Which library pieces, and where

| Use | Piece | Origin | Note |
|---|---|---|---|
| Pinned scroll sections | GSAP ScrollTrigger | already installed | One trigger per sequence |
| Copy beats beside "The Rise" | Sticky Scroll Reveal pattern | Aceternity | Rebuilt to our tokens, not pasted |
| Hero headline load-in | Text Generate Effect | Aceternity | Once per visit |
| Product photo depth on PDP | Parallax Hero Images (pointer) | Aceternity | Desktop only |
| Card lift | `luxury-tilt-card` | already in repo | Lift and shadow only, no tilt on touch |
| Reviews | `infinite-moving-cards` | already in repo | As built |
| Search | `placeholders-and-vanish-input` | already in repo | As built |
| Journal reading line | `tracing-beam` | already in repo | Journal only |
| Mobile filter sheet, drawers | Radix-based sheet | Watermelon UI or existing modal | Only if the existing modal cannot do it |
| Not used | Sparkles, meteors, beams, globe, glare, moving borders | Aceternity / Magic UI | Reads as software marketing, not a food boutique |

## 6. Media: what the owner makes, what the build does

Owner makes (prompts already supplied on 11 November):

| ID | Asset | Tool | Size |
|---|---|---|---|
| A, B | Hero with nuts in the air, desktop and mobile | Nano Banana Pro | 16:9, 9:16 |
| C, D | Gift box full, and empty with nuts above it | Nano Banana Pro | 16:9 |
| 1D, 1M | Float loop | Flow, Omni 1.2 Flash, 8 s | 16:9, 9:16 |
| 2D, 2M | Rise | Flow, 8 s, steady speed | 16:9, 9:16 |
| 3 | Gather | Flow, 8 s, steady speed | 16:9 |
| S | Saunf collection photo | Nano Banana Pro | 1:1 |

The build then:

- turns clips 2D, 2M and 3 into WebP frame sequences (about 96 frames desktop at 1600px wide, about 64 frames mobile at 720px);
- compresses the loop clips to WebM with MP4 fallback and cuts matching posters from their first frames;
- loads the first frame immediately and the rest only when the section is near.

Budgets (to be measured and reported, not assumed): hero poster under 150 KB; loop under 2.5 MB desktop and 1.5 MB mobile; each sequence under 6 MB desktop and 3 MB mobile; no sequence downloaded before its section is within one screen; canvas pixel ratio capped at 2.

AI-made scenes are presentation art. Any image that shows packaging or contents that are not an exact SKU keeps a visible "concept" caption, as the Gift Atelier photo does now.

## 7. Build order

Each phase is its own commit on the review branch with screenshots, typecheck, lint, build and the offline suite, then hosted CI.

| Phase | Work | Needs from owner |
|---|---|---|
| 1 | Hero Float loop and "The Rise" sequence | Images A, B; clips 1D, 1M, 2D, 2M; the three lines of copy |
| 2 | Gift Atelier "Gather", gifting page header | Images C, D; clip 3 |
| 3 | Global motion: card lift, fly-to-bag, condensing header, route cross-fade | Nothing |
| 4 | Shop and product page | Saunf photo; decision on collection stills |
| 5 | Cart, checkout, order success, reading pages | Nothing |
| 6 | Performance and accessibility pass, real-phone check | A phone test by the owner |

Phase 3 does not depend on any media and can start immediately on approval.

## 8. Done means

- Works at 360, 390, 768 and 1440 px, 200% zoom, EN/UR/AR, light and dark.
- Reduced motion shows stills everywhere; every sequence has a still fallback if frames fail to load.
- Keyboard reaches every action; touch targets at least 44px.
- No horizontal scroll; no layout shift when media arrives.
- Budgets in section 6 measured and written down.
- Typecheck, hooks lint, build and privacy audit, full offline suite and hosted CI green on the final commit.
- Owner has seen it on a real phone.

## 9. Open decisions for the owner

1. Approve "The Weightless Table" as the direction, replacing the still-life hero brief.
2. Confirm or rewrite the three "Rise" lines.
3. Should Ask AllBarka stay as built, or move into the search field itself?
4. Cleanup audit decisions (separate review, unchanged).
