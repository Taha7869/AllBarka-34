---
name: allbarka-design-and-i18n
description: >-
  Enforces AllBarka's Harrods-level luxury boutique design system, color tokens,
  typography, dark mode parity, WCAG AA accessibility, reduced motion, and
  trilingual (English, Urdu RTL, Arabic RTL) internationalization via
  LanguageContext. Use this skill whenever creating or updating UI components,
  pages, modals, or translations.
---

# AllBarka Luxury Design System & Internationalization (i18n)

## 1. Component Reuse & Architecture Pre-Check
- **Mandatory Inventory Check**: Before creating any new React component, inspect [`docs/COMPONENTS_INVENTORY.md`](../../docs/COMPONENTS_INVENTORY.md) and reuse existing components in `src/components/`.
- **Tech Stack**: React 19 + TypeScript + Tailwind CSS v4 + Motion (`motion/react`). All new components must be placed in `src/components/`.

## 2. Visual Identity & Color Tokens
- **Aesthetic**: Harrods-level luxury boutique—restrained, editorial, tactile, and warm. Avoid cheap neon gradients, gimmicky badges, or cluttered layouts.
- **Canonical Tokens**:
  - **Emerald (Primary)**: `#1E3A2B` (deep boutique emerald `#042821` in dark accents)
  - **Gold (Accent)**: `#C7982F` / `#B8935F`
  - **Ivory**: `#FDFBF7`
  - **Base Cream**: `#F6F1EA`
  - **Surface**: `#FFFCF7`
  - **Ink (Body Copy)**: `#29231D`
  - **Bronze**: `#806326`
- **Typography**:
  - **Headings**: `Playfair Display` (`font-serif`)
  - **Body / UI Controls**: `Inter` (`font-sans`)
  - **Urdu / Arabic RTL**: `Amiri`

## 3. Accessibility, Dark Mode & Motion
- **WCAG AA Contrast**: Maintain at least `4.5:1` contrast ratio for all body copy in both light and dark modes.
- **Dark Mode**: Every surface, card, input, pill, and modal must maintain full dark-mode support (`dark:...` classes and CSS variables). Never hardcode light-only backgrounds with unreadable text in dark mode.
- **Touch Targets**: Mobile-first responsive layouts; interactive buttons, inputs, and selector pills must have a minimum `44px` (`min-h-[44px]`) touch target.
- **Reduced Motion**: Respect `prefers-reduced-motion` (via `useReducedMotion()` or CSS media queries) in every animation, carousel, and modal transition.

## 4. Trilingual Support (`en`, `ur`, `ar`) & RTL
- **LanguageContext**: All customer-facing UI text must route through `useLanguage()` (`t(...)`) in [`src/contexts/LanguageContext.tsx`](../../src/contexts/LanguageContext.tsx).
- **RTL Layout Parity**: Urdu (`ur`) and Arabic (`ar`) render with `dir="rtl"`. Use logical spacing/alignment or explicit RTL-safe flex/grid layouts so drawers, headers, carousels, and modals work seamlessly in both LTR and RTL.
- **Reviews**: Use Lahore neighborhood tags only (`DHA Phase 6`, `Gulberg III`, `Model Town`) with no relative dates.
