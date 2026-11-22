# AllBarka Premium Home Redesign — Phase 1 Plan

**Date:** 22 November 2026 (Asia/Karachi)  
**Branch:** `ag/20261122-premium-home` (branched from `origin/claude/celebrations-foundation-20261112` at `4a46825`)  
**Scope:** Phase 1 only — full home audit, calm luxury design system & wireframes, 6 branded studio packaging samples + montage, and an isolated Hero prototype at `/preview/premium-home`. Live `src/pages/HomePage.tsx` is **untouched**.

---

## 1. Step A — Current Home Page Audit (`src/pages/HomePage.tsx`)

Inspecting `src/pages/HomePage.tsx`, `src/components/AllBarkaHero.tsx`, and `src/lib/storefrontContent.ts` reveals **11 stacked visual blocks** between header and footer (including 2 infinite marquees, 2 rotating carousels, 2 search/AI inputs, 2 duplicated 3-pillar trust strips, and `<ScrollReveal>` fade-ups wrapping every section).

| # | Current Home Section / Block | Source Component | What It Does | Conversion Value | Phase 2 Action (Zero Features Deleted) |
| --- | --- | --- | --- | --- | --- |
| 1 | Conditional Announcement Banner | `StorefrontBanner.tsx` | Optional top promo bar when enabled in Admin Content | **Med** (seasonal) | **Keep** (only renders when admin enables an active campaign; slim 1-line bar) |
| 2 | Split Hero (`heritage-hero`) | `AllBarkaHero.tsx` (lines 99–149) | Crest, eyebrow, headline, copy, 2–3 CTAs, hero note, right video/poster + caption + play toggle | **High** | **Redesign (Home #1)** — Calm full-bleed emerald + travertine presentation with ONE signature lid-reveal motion and 2 decisive CTAs |
| 3 | Hero Discovery Dock (`table-discovery`) | `AllBarkaHero.tsx` (lines 150–242) | Search box + Voice button + Ask AllBarka AI + Selection Guide modal + horizontal CategoryQuickPills + Experiences row (`Plan Mehmaan Table` & `Shop Table Scene` modals) | **Med/Low** (overcrowds fold) | **Move (not delete):** Search stays cleanly in Header + `/shop`; `SelectionGuide`, `Plan Mehmaan Table` & `Shop Table Scene` move to `/gifting` & `/occasions`; AI Buddy remains on the single floating concierge button |
| 4 | Explore Our Collections (`collections`) | `CategoryCarousel.tsx` | Auto-rotating 13-slide Embla carousel of all categories | **High** | **Refine (Home #2)** — Calm 6-card editorial grid of hero houses (Dates, Dry Fruits, Gift Boxes, Celebration Boxes, Saffron & Honey, Cold-Pressed Oils) + `"Explore all 13 collections →"` to `/shop` (full 13-category switcher stays on `/shop`) |
| 5 | Boutique Selections (`showcase`) | `BoutiqueSelections.tsx` | 5-tab auto-rotating showcase (3 products per tab + play/pause) | **High** | **Refine (Home #3)** — Calm manual 3-tab edit (Dry Fruits & Dates · Luxury Hampers · Celebration Boxes) with crisp photography, prices, and zero forced auto-tab jumping |
| 6 | AI Gift Finder (`GiftFinder`) | `GiftFinder.tsx` (stacked inside `occasions`) | Full inline natural-language gift search + voice + preset chips + result cards | **Med** | **Move to `/gifting` & `/occasions`** where high-intent gifters actively filter by budget and recipient |
| 7 | Find a Gift for Your Occasion (`occasions`) | `FindGiftOccasionSection.tsx` | 5 occasion cards (Wedding/Nikkah, Umrah/Hajj, Ramadan/Eid, Birth, Corporate) + custom quote modal trigger | **High** | **Refine (Home #4 — The Gifting Atelier)** — Editorial asymmetric layout highlighting Wedding/Nikkah Bid Boxes, Eid/Ramadan Hampers, Umrah Tabarruk & Corporate Bespoke with direct destination links |
| 8 | Editorial Care Pillars (`care`) | Inline in `HomePage.tsx` (lines 76–124) | Dark emerald band with `WordScrollReveal`, `MagneticButton` (`/faq`), and 3 numbered pillars (`01 Purity`, `02 Freshness`, `03 Delivery`) | **Med** | **Merge into Home #5 (The Lahore House Standard)** — Single composed emerald band merging Care Pillars + Assurances without `WordScrollReveal` or `MagneticButton` gimmicks |
| 9 | Customer Reviews Marquee (`reviews`) | `AllBarkaMovingReviews.tsx` | Infinite horizontal scrolling card marquee (`InfiniteMovingCards`) + ambient gold blur | **Med** | **Refine (Home #6 — Patron Voices)** — Replace generic scrolling marquee with 3 calm, static editorial patron notes + quiet links to `/story` and `/faq` |
| 10 | Inline FAQ Accordion (`faq`) | `FAQSection.tsx` | 3 expandable FAQ items + WhatsApp link | **Low on Home** | **Move to dedicated `/faq` route** (already live at `/faq`) with a quiet link from Home #6 & Footer |
| 11 | Assurances Strip + Collection Logo Loop | Inline in `HomePage.tsx` (lines 162–179) + `CollectionLogoLoop.tsx` | 3-column assurances strip duplicating #8 verbatim + second infinite marquee (`LogoLoop`) duplicating #4's 13 categories | **Low (duplication)** | **Consolidate / Move:** Assurances merge into Home #5; `CollectionLogoLoop` moves to `/shop` footer strip (zero duplicated home marquees) |

### Summary: Proposed 6-Section Home Architecture (7 incl. Footer)
1. **Hero — The Presentation** (ONE signature lid/seal reveal motion; calm negative space; 2 CTAs; area-level Lahore provenance).
2. **Signature Collections — Curated Houses** (6 architectural visual tiles + link to full `/shop`).
3. **House Selections — Featured Reserve** (Single calm 3-tab product showcase, manual tabs, clear pricing).
4. **The Gifting Atelier — Occasions & Bid Boxes** (Editorial split for Nikkah, Eid/Ramadan, Umrah Tabarruk, Corporate + link to `/gifting` Gift Finder & planners).
5. **The Lahore House Standard — Provenance & Craft** (Unified deep-emerald 3-pillar craft band; replaces both old Care Pillars & Assurances Strip).
6. **Patron Voices — Quiet Proof** (3 calm static quotes + refined entry links to `/story` and `/faq`).
7. **Footer** (Existing trilingual footer with cookie settings, policies, and area-level Lahore contact).

---

## 2. Historical Premium Photography Audit (`git log --all -- public/images`)

Inspecting git history surfaced AllBarka's strongest cohesive editorial studio photography across commits `9474325`, `d7d9165`, `9236838`, `b9254f5`, and `4a6db50`. Six benchmark images were visually inspected directly:

| # | Path | Origin Commit | Visual Style Breakdown (Lighting, Background, Angle, Props, Crop) |
| --- | --- | --- | --- |
| 1 | `public/images/generated/org-honey-catalog-v1.webp` | `9474325` | **Lighting:** Warm late-afternoon directional side window light with diagonal botanical leaf shadows across the backdrop; amber glow refracting through glass. **Background:** Honed porous warm travertine/limestone slab & matching matte plaster wall. **Angle:** Eye-level (`~10°`). **Props:** Raw golden honeycomb + carved dark wood dipper left, folded forest-emerald woven linen right, tiny white blossoms. **Crop:** Centered 1:1 with generous breathing room around brushed-gold lid & cream AllBarka label. |
| 2 | `public/images/generated/org-saffron-catalog-v1.webp` | `9474325` | **Lighting:** Matching golden-hour raking side sunlight + dappled botanical shadows. **Background:** Warm pitted travertine surface + sunlit sandstone backdrop. **Angle:** Eye-level (`~12°`) shallow depth of field. **Props:** Small carved travertine pinch dish of crimson strands left, deep emerald linen cloth right, subtle velvet pouch accent. **Crop:** Centered 1:1 highlighting clear apothecary glass, brushed gold cap, and crisp cream cotton label (`AllBarka`). |
| 3 | `public/images/products/medjool-dates-1.webp` | `d7d9165` | **Lighting:** Soft directional natural window light from upper-left creating gentle soft-edged shadows and natural specular highlights on glossy date skin. **Background:** Warm matte plaster/limestone tabletop (`#EAE2D6`). **Angle:** Classic 45° three-quarter hero angle. **Props:** Speckled matte cream stoneware bowl, folded deep forest-emerald linen cloth at top-left, two whole dates + one cleanly halved cross-section in foreground. **Crop:** Tight 4:3 framing the bowl off-center with uncluttered warm stone at upper-right. |
| 4 | `public/images/products/ajwa-dates-1.webp` | `d7d9165` | **Lighting:** Identical soft natural side light emphasizing matte dark-ebony wrinkled Ajwa skin texture. **Background:** Warm matte limestone tabletop. **Angle:** 45° three-quarter view. **Props:** Matching speckled matte cream ceramic bowl, deep forest-emerald draped linen top-left, three scattered accent dates in foreground. **Crop:** 4:3 calm editorial balance. |
| 5 | `public/images/products/bundle-gold-hamper-1.webp` | `9236838` | **Lighting:** Soft warm raking afternoon light from upper-right; subtle natural shading inside dividers. **Background:** Smooth warm parchment-sandstone surface. **Angle:** Elevated 35–40° three-quarter tabletop view. **Props:** Rigid cream 4-compartment gift tray wrapped in champagne-gold satin ribbon tied in a crisp bow; dark muted forest-emerald linen runner cutting diagonally behind upper-left. **Crop:** Centered 1:1 with clean stone margin around every corner. |
| 6 | `public/images/living-gallery-final/hero-desktop.webp` | `4a6db50` | **Lighting:** Warm golden-hour side light casting delicate olive-branch leaf shadows onto deep emerald plaster. **Background:** Deep matte Lahore emerald wall (`#0F3528`) paired with honed porous travertine stone plinth edged in hairline antique brass. **Angle:** Calm eye-level/20° asymmetric hero framing. **Props:** Speckled stoneware platter of whole pistachios, cashews, almonds & walnuts + small glass oil vial on right. **Crop:** Wide 16:9 with 45%+ serene negative space on the left for typography. |

**Cohesive Visual Rule Carried Into Step C & Phase 2:** Every photograph shares the same Lahore house universe — **warm honed travertine stone + deep matte forest-emerald linen/plaster + dappled afternoon window sunlight + brushed antique gold metal/foil + real, tactile unretouched food textures**.

---

## 3. Step B — Design System Specification

### 3.1 Color Palette (6 Named Brand Hex Values — Derived from `src/index.css`)
Zero generic terracotta-cream or black-neon; rooted strictly in AllBarka's existing Lahore emerald, antique gold, and warm parchment identity:

| Role | Token Name | Hex | Usage & Contrast Note |
| --- | --- | --- | --- |
| **House Deep Emerald** | `--ab-emerald-deep` | `#042821` | Hero canvas, House Standard band, primary luxury dark boxes & primary CTA surface (`15.4:1` vs Alabaster Ivory) |
| **Botanical Emerald** | `--ab-emerald-mid` | `#1E3A2B` | Elevated dark surfaces, primary buttons on light canvas, interactive hover depth (`12.6:1` vs Alabaster Ivory) |
| **Warm Parchment Canvas** | `--ab-parchment` | `#FDFBF7` | Calm primary page background in light mode (soft paper warmth, zero stark `#FFFFFF` glare) |
| **Honed Travertine** | `--ab-travertine` | `#F2ECE2` | Soft tonal section separation, image frame mats, subtle cards (replaces heavy borders) |
| **Burnished Antique Gold** | `--ab-gold` | `#C7982F` | Hairline rules, embossed crest, lid trim, active indicators (decorative/large accents; dark-mode label uses `#E4C783`; light-mode text label uses Bronze `#806326` for WCAG AA `5.1:1`) |
| **Walnut Ink** | `--ab-walnut-ink` | `#29231D` | Primary light-mode typography (`14.4:1` on Parchment; muted copy `#635B52` at `5.9:1`); dark mode canvas uses `#121615` with Warm Cream `#F6F1EA` (`14.7:1`) |

### 3.2 Typography & Multilingual Scale
Two disciplined Latin families already loaded in `src/index.css`, paired with authentic Urdu & Arabic faces:
- **Display & Editorial Serif (EN):** `"Playfair Display", Georgia, serif` (weights `500`, `600`, italic `400` for refined single-phrase emphasis — never heavy `font-black`).
- **UI & Body Sans (EN):** `"Inter", -apple-system, sans-serif` (weights `400`, `500`, `600`; tabular numerals for prices).
- **Urdu (RTL):** `"Noto Nastaliq Urdu", "Amiri", serif` — `line-height: 2.05`, `letter-spacing: 0` (strictly no uppercase tracking!).
- **Arabic (RTL):** `"Amiri", "Scheherazade New", serif` — `line-height: 1.75`, `letter-spacing: 0`.

| Token | Desktop (1440px) | Mobile (390px) | Line Height | Tracking (EN only) |
| --- | --- | --- | --- | --- |
| `Hero Display (H1)` | `clamp(2.5rem, 4.4vw, 4rem)` (`64px`) | `2.25rem` (`36px`) | `1.08` (EN) / `1.85` (UR) / `1.45` (AR) | `-0.02em` |
| `Section Title (H2)` | `clamp(1.875rem, 2.8vw, 2.75rem)` (`44px`) | `1.75rem` (`28px`) | `1.15` (EN) / `1.9` (UR) | `-0.015em` |
| `Card / Pillar Title (H3)` | `1.25rem` (`20px`) | `1.125rem` (`18px`) | `1.3` (EN) / `1.9` (UR) | `-0.01em` |
| `Editorial Lead` | `1.0625rem` (`17px`) | `0.95rem` (`15px`) | `1.65` (EN) / `2.1` (UR) | `0` |
| `Body / Description` | `0.9375rem` (`15px`) | `0.875rem` (`14px`) | `1.65` (EN) / `2.1` (UR) | `0` |
| `House Eyebrow / Meta` | `0.6875rem` (`11px`) | `0.6875rem` (`11px`) | `1.4` | `0.24em` uppercase (EN); `0` (UR/AR) |

### 3.3 Layout Wireframes (Desktop 1440px & Mobile 390px)

#### Section 1 — Hero: The Presentation
```text
DESKTOP (1440px) — Deep Emerald (#042821) asymmetric editorial stage, min-h ~640px
+----------------------------------------------------------------------------------+
|  [Quiet Header: AllBarka Crest · Shop · Gifting · Occasions · EN/UR/AR · Bag]    |
+----------------------------------------------------------------------------------+
|                                                                                  |
|   [Gold Crest Seal]                      +------------------------------------+  |
|   LAHORE GIFTING HOUSE                   |                                    |  |
|                                          |  [High-priority WebP 16:9 Photo:   |  |
|   Heirloom dry fruits &                  |   Open AllBarka emerald gift box   |  |
|   *signature gift boxes.*                |   with Medjool/Ajwa dates & nuts]  |  |
|                                          |                                    |  |
|   Hand-selected harvests & bespoke       |   ONE SIGNATURE MOTION (once):     |  |
|   presentations, packed fresh in Lahore. |   Gold crest seal presses ->       |  |
|                                          |   rigid lid lifts smoothly (~1.1s) |  |
|   [ Explore Dry Fruits ] [ Shop Gifts ]  |   revealing box; static on RM.     |  |
|                                          +------------------------------------+  |
|   Single-origin grading · Packed fresh in Lahore · Nationwide delivery           |
+----------------------------------------------------------------------------------+

MOBILE (390px) — Image visible in first viewport for < 2.5s LCP
+----------------------------------+
| [Menu]  [AllBarka]   [UR] [Bag]  |
+----------------------------------+
|  +----------------------------+  |
|  | [16:10 Hero Gift Box Photo |  |
|  |  fetchPriority="high"      |  |
|  |  + 1-shot lid/seal reveal] |  |
|  +----------------------------+  |
|  LAHORE GIFTING HOUSE            |
|  Heirloom dry fruits &           |
|  *signature gift boxes.*         |
|  Hand-selected harvests, packed  |
|  fresh in Lahore.                |
|  [     Explore Dry Fruits     ]  |
|  [       Shop Gift Boxes      ]  |
|  Packed fresh in Lahore · COD    |
+----------------------------------+
```

#### Section 2 — Signature Collections (6 Curated Houses)
```text
DESKTOP (1440px) — Warm Parchment (#FDFBF7)
+----------------------------------------------------------------------------------+
|  CURATED HOUSES                                     Explore all 13 collections ->|
|  Six pillars of the AllBarka pantry.                                             |
|  +---------------------+   +---------------------+   +---------------------+     |
|  | [Dates Studio 4:3]  |   | [Dry Fruits 4:3]    |   | [Gift Boxes 4:3]    |     |
|  | Medina & Heritage   |   | Mountain Harvest    |   | Signature Hampers   |     |
|  +---------------------+   +---------------------+   +---------------------+     |
|  +---------------------+   +---------------------+   +---------------------+     |
|  | [Celebration 4:3]   |   | [Saffron & Honey]   |   | [Cold-Pressed Oils] |     |
|  | Nikkah & Bid Boxes  |   | Desi Essentials     |   | Small-Batch Oils    |     |
|  +---------------------+   +---------------------+   +---------------------+     |
+----------------------------------------------------------------------------------+

MOBILE (390px) — Clean 2-column architectural grid (zero cramped swipe chrome)
+----------------------------------+
|  CURATED HOUSES                  |
|  Six pillars of the pantry.      |
|  +------------+  +------------+  |
|  | [Dates]    |  | [Nuts]     |  |
|  +------------+  +------------+  |
|  +------------+  +------------+  |
|  | [Gifts]    |  | [Bid Box]  |  |
|  +------------+  +------------+  |
|  +------------+  +------------+  |
|  | [Honey]    |  | [Oils]     |  |
|  +------------+  +------------+  |
|  [ Explore all 13 collections ->]|
+----------------------------------+
```

#### Section 3 — House Selections (Single Calm Product Showcase)
```text
DESKTOP (1440px) — Honed Travertine (#F2ECE2)
+----------------------------------------------------------------------------------+
|  HOUSE SELECTIONS                 [Dry Fruits & Dates] [Hampers] [Bid Boxes]     |
|  +---------------------+   +---------------------+   +---------------------+     |
|  | [4:3 Studio Photo]  |   | [4:3 Studio Photo]  |   | [4:3 Studio Photo]  |     |
|  | Product Name        |   | Product Name        |   | Product Name        |     |
|  | 250g · Rs. X,XXX    |   | 500g · Rs. X,XXX    |   | Box  · Rs. X,XXX    |     |
|  | [ Add to Bag ]      |   | [ Add to Bag ]      |   | [ View Box ]        |     |
|  +---------------------+   +---------------------+   +---------------------+     |
+----------------------------------------------------------------------------------+

MOBILE (390px)
+----------------------------------+
|  HOUSE SELECTIONS                |
|  [Dry Fruits] [Hampers] [Boxes]  |
|  +----------------------------+  |
|  | [Product Card 1]           |  |
|  +----------------------------+  |
|  | [Product Card 2]           |  |
|  +----------------------------+  |
|  | [Product Card 3]           |  |
|  +----------------------------+  |
+----------------------------------+
```

#### Section 4 — The Gifting Atelier (Occasions & Bid Boxes)
```text
DESKTOP (1440px) — Warm Parchment (#FDFBF7)
+----------------------------------------------------------------------------------+
|  +----------------------------------+   THE GIFTING ATELIER                      |
|  |                                  |   Dressed for every milestone.             |
|  | [Eid Gift Box w/ Ribbon & Card   |   --------------------------------------   |
|  |  4:3 Editorial Photograph]       |   01  Wedding & Nikkah Bid Boxes     ->    |
|  |                                  |   02  Ramadan & Eid Hampers          ->    |
|  |                                  |   03  Umrah & Hajj Tabarruk          ->    |
|  +----------------------------------+   04  Corporate & Bespoke Orders     ->    |
|                                         [ Open Gift Finder & Planner -> ]        |
+----------------------------------------------------------------------------------+

MOBILE (390px)
+----------------------------------+
|  [Eid Gift Box 4:3 Photo]        |
|  THE GIFTING ATELIER             |
|  Dressed for every milestone.    |
|  01 Wedding & Nikkah Boxes   ->  |
|  02 Ramadan & Eid Hampers    ->  |
|  03 Umrah & Hajj Tabarruk    ->  |
|  04 Corporate & Bespoke      ->  |
|  [ Open Gift Finder -> ]         |
+----------------------------------+
```

#### Section 5 — The Lahore House Standard (Unified Craft Band)
```text
DESKTOP (1440px) — Deep Emerald (#042821), Alabaster Ivory text (#FDFBF7)
+----------------------------------------------------------------------------------+
|  THE HOUSE STANDARD                                                              |
|  Quiet standards behind every sealed box.                                        |
|  +---------------------+   +---------------------+   +---------------------+     |
|  | 01                  |   | 02                  |   | 03                  |     |
|  | Hand-Graded Lots    |   | Packed Fresh        |   | Gifting Care        |     |
|  | Whole kernels &     |   | Sealed to order in  |   | Ribbon, card &      |     |
|  | verified origins.   |   | Lahore; zero shelf  |   | nationwide courier  |     |
|  |                     |   | stagnation.         |   | packing.            |     |
|  +---------------------+   +---------------------+   +---------------------+     |
+----------------------------------------------------------------------------------+

MOBILE (390px) — Vertical stack with subtle gold hairline dividers
+----------------------------------+
|  THE HOUSE STANDARD              |
|  01  Hand-Graded Lots            |
|  ------------------------------  |
|  02  Packed Fresh in Lahore      |
|  ------------------------------  |
|  03  Gifting & Delivery Care     |
+----------------------------------+
```

#### Section 6 — Patron Voices + Quiet Footer Entry
```text
DESKTOP (1440px) — Warm Parchment (#FDFBF7)
+----------------------------------------------------------------------------------+
|  PATRON VOICES                                        Our Story ->  ·  FAQ ->    |
|  +---------------------+   +---------------------+   +---------------------+     |
|  | "Quote 1..."        |   | "Quote 2..."        |   | "Quote 3..."        |     |
|  | — Patron, Lahore    |   | — Patron, Islamabad |   | — Patron, Karachi   |     |
|  +---------------------+   +---------------------+   +---------------------+     |
+----------------------------------------------------------------------------------+

MOBILE (390px) — Clean vertical stack of 2–3 calm editorial quotes
+----------------------------------+
|  PATRON VOICES                   |
|  "Quote 1..." — Patron, Lahore   |
|  "Quote 2..." — Patron, Karachi  |
|  [ Our Story -> ]  [ FAQ -> ]    |
+----------------------------------+
```

---

### 3.4 ONE Signature Motion & Performance Budget
- **Exact Choreography (Hero ONLY):**
  - On first visit to the Hero, a sculpted deep-emerald rigid box lid bearing the metallic gold AllBarka crest rests cleanly over the right-hand hero frame.
  - At `120ms`, the embossed gold crest seal gives a crisp tactile **press & shimmer** (`240ms`), followed immediately by the rigid matte emerald lid **hinging/lifting smoothly upward (`780ms`, `cubic-bezier(0.22, 1, 0.36, 1)`)** to unveil the sunlit open AllBarka dates & dry-fruit presentation chest beneath, then unmounting cleanly so the hero image is completely unobstructed.
  - A subtle quiet 44×44 `"Replay"` icon button below the frame lets reviewers replay the reveal on demand; zero looping or distracting auto-motion.
- **Zero Motion Spam Below the Fold:** Remove `<ScrollReveal>`, `<WordScrollReveal>`, `<MagneticButton>`, `InfiniteMovingCards`, and `LogoLoop` from the Home page so scrolling feels anchored, architectural, and serene like Harrods or Fortnum & Mason.
- **`prefers-reduced-motion: reduce`:** The lid overlay is completely skipped (`returns null` + `motion-reduce:hidden`); the crisp static WebP photograph renders immediately with zero animation.
- **Mobile LCP `< 2.5s` Strategy:**
  - Serve hero photography as compressed responsive WebP (`<= 120 KB`, `width` & `height` attributes explicit, `decoding="sync"`, `loading="eager"`, `fetchPriority="high"`).
  - Never hide the underlying `<img>` behind `opacity: 0`; the `<img>` paints at `t = 0` so Chromium records LCP immediately while the decorative CSS-transform lid lifts purely on the GPU compositor thread (`transform` + `opacity` only, zero layout thrash, `CLS = 0`).

---

### 3.5 What Was Cut / Moved from Home — and Why

| Element Removed from Home | Where It Moves (Preserved 100%) | Why Cut from Home |
| --- | --- | --- |
| `table-discovery` search + voice + 6 competing buttons (`Ask AllBarka`, `Selection Guide`, `CategoryQuickPills`, `Plan Mehmaan Table`, `Shop Table Scene`) | Header Search + `/shop`; planners & `SelectionGuide` live on `/gifting` & `/occasions`; AI Buddy remains in floating concierge button | Six competing CTAs directly below the hero fractured visual hierarchy and made AllBarka feel like a crowded marketplace instead of a luxury gifting house. |
| Inline `GiftFinder` widget | `/gifting` and `/occasions` | Duplicates hero/header search on Home and interrupts rhythm before customers see the Occasions destinations. |
| `InfiniteMovingCards` marquee | Replaced on Home with 3 calm static quotes (full reviews remain preserved) | Continuous scrolling marquees read as generic SaaS templates and undermine quiet luxury trust. |
| `FAQSection` accordion | Dedicated `/faq` route (linked cleanly from Section 6 & Footer) | Low-intent utility accordion added vertical bulk to Home; shoppers with policy/delivery questions click `/faq` directly. |
| Duplicated `editorial-assurances` strip + `CollectionLogoLoop` marquee | Assurances merged into Home Section 5 (`The Lahore House Standard`); `CollectionLogoLoop` moves to `/shop` | Repeated the exact 3 pillars from `Care Pillars` and repeated all 13 categories from `CategoryCarousel` within two scrolls of each other. |
| Repetitive `<ScrollReveal>` / `<WordScrollReveal>` / `<MagneticButton>` | Removed from Home sections | Constant slide-ups on every scroll step feel jittery and cheapen editorial stillness; reserving motion for **one** Hero signature moment makes it memorable. |

---

## 4. Branded Packaging Samples (Step C) & Hero Prototype (Step D)
- **6 Branded Studio Samples:** `public/images/drafts-premium-20261122/` (`01-hero-gift-box-dates.webp` through `06-eid-gift-box-card-ribbon.webp`)
- **Contact Sheet Montage:** `docs/design/premium-samples-montage.jpg`
- **Isolated Hero Prototype Route:** `/preview/premium-home` (`src/pages/PremiumHomePreviewPage.tsx`, `src/components/PremiumHeroPrototype.tsx`) — live `/` is untouched.
- **Verification Screenshots:** `docs/design/hero-desktop.png` (`1440×900`) and `docs/design/hero-mobile.png` (`390×844`).
