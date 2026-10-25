# AllBarka Design System

## Brand Colors

These are the core exact hex values for the AllBarka brand:

- **Emerald (Primary):** `#1E3A2B` (Hover: `#14281E`)
- **Gold (Accent):** `#C7982F` (Hover: `#B58724`, Light: `#D4B483`)
- **Ivory (Base/Canvas):** `#FDFBF7`
- **Base Cream:** `#F6F1EA` (Used extensively in dark mode text and distinct light canvases)
- **Surface:** `#FFFCF7` (For cards, modals, dropdowns)
- **Ink (Text):** `#29231D` (Muted: `#635B52`)
- **Bronze (Accent Text):** `#806326` (For labels requiring WCAG AA 4.6+:1)

Dark Mode incorporates deep charcoal/forest variations:
- **Dark Base:** `#121615`
- **Dark Surface:** `#1A201E`
- **Dark Emerald:** `#0E4A3B`
- **Dark Gold/Accent:** `#D4A843`

## Typography

AllBarka utilizes a highly specific dual-font and multi-language stack to uphold its luxury boutique feel:

- **Headings & Display:** `Playfair Display`, Georgia, Cambria, serif.
- **Body & Sans:** `Inter`, Satoshi, -apple-system, sans-serif.
- **Urdu (RTL):** `Noto Nastaliq Urdu`, `Amiri`, serif (Line-height: 2.1, strict normalized letter spacing).
- **Arabic (RTL):** `Amiri`, `Scheherazade New`, serif (Line-height: 1.8).

## Shadows & Elevations

The UI favors minimal flat borders with signature luxury hairlines, and distinct soft shadows on elevation:

- **Standard Card Shadow:** `0 4px 20px -4px rgba(41, 35, 29, 0.06), 0 2px 6px -1px rgba(41, 35, 29, 0.03)`
- **Hovered Card Shadow:** `0 16px 36px -8px rgba(41, 35, 29, 0.12), 0 4px 12px -2px rgba(41, 35, 29, 0.05)`
- **Luxury Hairline Dash:** `1px dashed rgba(41, 35, 29, 0.12)` (Gold variant `0.38` opacity)

## Animation Standards

- **Transitions:** Baseline `0.25s ease` on core background and color shifts.
- **Micro-interactions:** Meteor effects `5s linear`, quick view ringing `2.5s ease-out`, shimmer sweeps `1.6s ease-in-out` and luxury borders at `6s linear`.
- **Pre-fill / Skeleton:** Luxury gold shimmer effect on loading skeletons (`1.8s ease-in-out`).

## Required Development Rules

When maintaining or extending the AllBarka frontend UI, all agents and developers **MUST** abide by these rules:

1. **Reuse existing components from inventory before creating new ones.** Do not duplicate UI logic. See `COMPONENTS_INVENTORY.md`.
2. **All new components TypeScript + Tailwind.** Strict type checking and explicit tailwind utility execution.
3. **Respect prefers-reduced-motion.** Animation hooks and global CSS explicitly disable duration and transforms on `prefers-reduced-motion: reduce`.
4. **Keep dark mode working.** Ensure text readability and contrast thresholds are actively tested inside `<div class="dark">`.
5. **All user-facing text via `t()` calls.** No hardcoded English strings in templates; use the central translation context/utilities.
