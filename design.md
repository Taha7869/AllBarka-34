# AllBarka design direction

Status: OWNER-CONFIRMED direction; implementation tracked in expansion Stage 5.

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
