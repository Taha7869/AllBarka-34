# AllBarka design direction

Status: OWNER-CONFIRMED direction; Stage 5 implemented and locally browser-verified. Live release remains Stage 6.

This status describes the existing design implementation below. Owner confirmed retail + gifting balance and existing assets first. Current bounded V1 implementation/evidence is in [PREMIUM_V1.md](docs/PREMIUM_V1.md); remaining proposals in [MASTER_PLAN.md](MASTER_PLAN.md) retain their own statuses. Apply [RULES.md](RULES.md) to each design/implementation checkpoint.

## Proposed next visual direction — The AllBarka Table

Recommend a Signature Table hero connecting daily pantry, Lahore hospitality and gifting, using existing emerald/ivory/gold and typography. Separate desktop/mobile art direction should give product and brand a clear focus, with existing search/category/guide tools in a quieter discovery area. Keep one compact homepage showcase. “What arrives” photography, scale/contents clarity and accurate option imagery support the visual work. Extend existing Studio controls for selected upgrades rather than adding a competing editor. Full M01–M34 proposals, dependencies and acceptance are in MASTER_PLAN.md; V1 implementation/evidence is scoped in PREMIUM_V1.md; no original photoshoot is claimed.

## Identity

Preserve the existing luxury dry-fruit identity. Use emerald `#1E3A2B`, dark emerald `#042821`, ivory `#FDFBF7`, cream `#F6F1EA`, surface `#FFFCF7`, ink `#29231D`, bronze `#806326` and existing gold `#C7982F` / champagne `#B8935F`. The supplied earthy reference informs secondary sand/olive surfaces; it does not replace the brand with a new palette.

Use gold for selected icons, fine borders, restrained highlights and subtle gold-dust light at hero/section corners. Keep text readable and product photography clear. Reuse existing luminous styles rather than layering multiple competing glow systems. Decorative layers are non-interactive, clipped to their surface and hidden from accessibility APIs.

Typography remains Playfair Display for editorial headings, Inter for controls/body text and Amiri for Urdu/Arabic. Premium appearance comes from consistent typography, spacing, image treatment and restrained merchandising.

## Customer mobile experience

- Design from 360–390px upward, then verify tablet and 1440px desktop.
- No horizontal page overflow. Form controls and prices must fit at 200% text zoom.
- Minimum 44px touch targets. Clear selected unit/variant, price and availability before the purchase action.
- Two-column product grids only where cards remain readable; narrow layouts may use one column.
- Sticky product action follows the product's actual sale mode: buy or inquire. It must not cover content, dialogs or device safe areas.
- Keep the agreed compact homepage and single product showcase. Content controls must not reintroduce the removed large deal/packaging grids.

## Admin experience

One authenticated workspace with role-based navigation. Admin manages catalog/content; staff sees only its order reader. The server enforces the same boundary.

Use the existing responsive admin surfaces. The item form follows: template/type → identity/category → content and photos → options/prices → SEO → review → draft/publish. Related fields are grouped; advanced optional fields are reachable without crowding the main flow.

Each input has a label, `(Lazmi / Required)` or `(Optional)` marker, and concise help where needed. Markers and errors are translated. Preserve input after failure. Announce saving, success and validation errors; focus the first invalid field. Dialogs support Escape, keyboard focus containment and return focus to their trigger. Warn before discarding unsaved edits.

Language tabs are English, Urdu and Arabic, with correct direction per input. Translation completion indicators reflect actual content. Product previews and draft settings remain private.

## Parity and performance

Support light/dark themes, keyboard controls, visible focus and body-text contrast of at least 4.5:1. Respect reduced motion. Prefer CSS decoration and existing animation libraries; do not add a heavy visual dependency for gold dust. Use responsive/lazy imagery and stable image ratios to avoid layout shifts.

## Implemented Stage 5 refinement

`premium-content.css` adds restrained corner gold light to the existing photographed hero, an editorial FAQ with native disclosure controls, and a responsive Studio form using existing brand tokens. The homepage retains one product showcase. Saved section order/visibility and menu labels/destinations reach real customer components; default content remains available when optional overrides are absent. Image inputs in Studio use safe URLs; file upload stays in the catalog editor.

Fixture-backed browser evidence covers 390×844 and 1440×900, EN/UR/AR, light/dark and reduced motion. The four Stage 5 JPGs show published fixture homepage content, not a deployed production header. No additional photo asset or visual dependency was introduced.

## Approved interaction language

Use a small, consistent press response, a fine gold edge/focus state, a real second-photo hover preview where available and short section entrances. Mobile uses press/swipe and explicit controls; essential information never depends on hover. Cart acknowledgement follows actual cart state; checkout pending feedback follows its real request. Keep existing photography, palette, single showcase and compact structure. Detailed passes and carried-forward release gates: `docs/admin-expansion/INTERACTION_POLISH.md`.

### Implemented interaction refinement

The existing controls/gallery/motion system now provide finite press and selected feedback, actual cart acknowledgement, a fine-pointer second-photo preview that yields to explicit browsing, current menu treatment and bounded reveal timing. The real mobile header fits 360px with four 44px utility targets; desktop navigation has a centered second row from 1280px. This was verified on actual header/PDP/cart in 24 size/language/theme combinations plus touch, keyboard and reduced-motion checks. See INTERACTION_POLISH.md for exact boundaries, including preserved quick-view flow and unverified live integrations.

### Implemented admin finishing pass

The shared Add/Edit item editor now has restrained gold-edged desktop section shortcuts and one compact mobile section selector. Existing palette, typography, fields and persisted data remain intact. Independent unsaved item/configuration protection, pending-save controls and focused error summaries improve actual editing behavior. The browser checks 360/390px and desktop in EN/UR/AR, light/dark, reduced motion and 200% enlarged text/control sizes; inspected fixture screenshots are recorded in ADMIN_FINISHING.md. This is source/fixture evidence, not a deployed private-dashboard claim.
