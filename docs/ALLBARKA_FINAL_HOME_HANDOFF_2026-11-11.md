# AllBarka final homepage pass

Start from the latest `claude/home-approved-20261111` head and bring in this asset commit. This handoff was prepared against `ea6618b`. Use a fresh worktree if another checkout has uncommitted changes. Read the existing homepage tracker, `AGENTS.md`, and `design.md` before editing.

## Finish the current design

1. **Hero.** Restore “Nature’s finest, delivered with Pure Elegance” as live, localized text. Keep the emerald copy area calm, the platter and oil down/right on desktop, and the subject below the copy on mobile. Retain both shopping and gifting actions. Use the new desktop and portrait art in the preview. Preserve CMS overrides, RTL, poster fallback, pause, reduced motion, and scroll without blocking navigation.
2. **Discovery.** Under the hero, give “Ask AllBarka” an actionable entry that opens the existing AI Buddy. Keep catalog search and mic as working controls and keep the existing floating entry usable. Confirm the mobile controls stay clear of each other. Test the action with the existing AI wiring and record production provider availability separately.
3. **Collections.** Build a visible warm travertine shelf with a restrained brushed-gold edge. Use the existing catalog imagery as round tiles, with readable labels below the circles and a prominent center tile. Preserve browse links, keyboard arrows and focus, mobile swipe, and reduced motion. Use CSS for the shelf and use existing approved catalog media.
4. **Cards and gifting.** On desktop, place Add to Bag and Quick View side by side with View Details below. Keep the three actions distinct and touch-friendly on mobile. Scope styling to the homepage so shared cards elsewhere keep their layout. Present Gift Atelier as an ivory editorial section with the gift-box photo, clear gifting and enquiry actions, and the existing full emerald footer. Mark the new gift photo as a packaging concept and keep actual SKU photos and data intact.

## Media

| Asset | Public path | Size | Use |
| --- | --- | --- | --- |
| Desktop hero still | `/images/living-gallery-final/hero-desktop.webp` | 1672 × 941 | Desktop artwork, reduced-motion still, or desktop film starting reference |
| Mobile hero still | `/images/living-gallery-final/hero-mobile.webp` | 941 × 1672 | Portrait artwork and mobile film starting reference |
| Gift Atelier concept | `/images/living-gallery-final/gift-atelier-concept.webp` | 1200 × 900 | Editorial packaging inspiration with a visible concept caption |

Keep the new WebP files at their versioned paths. Use the correct responsive hero image and lazy-load the Gift Atelier image. The existing film depicts a different scene. In the preview, pair matching artwork and video so playback does not jump between unrelated scenes. Keep existing film files available as a rollback. Track the replacement desktop and mobile motion assets separately.

### Replacement motion brief

Use the respective new still as the starting reference. Render an approximately 6–8 second seamless, silent loop at 24 fps, 1920 × 1080 desktop and 1080 × 1920 mobile. Lock the platter, bottle, stone and food geometry. Use soft drifting leaf shadows, a gentle change in reflected light across the brass edge and oil bottle, and a subtle camera ease only if the text-safe area stays fixed. Keep the desktop copy area dark and open and the portrait subject in the lower half. Render edge to edge. Preserve the seamless poster-to-video transition and use only one breakpoint's video per visitor. Retain playback controls and a static fallback for reduced motion and video failure. Export WebM with an MP4 fallback where supported by the current stack. Report both resulting file sizes and the loop transition.

## Review checklist

- Run typecheck, hooks lint, production build/privacy audit and hosted CI on the final commit.
- Verify 360, 390, 768 and 1440 px; 200% zoom; keyboard and focus; EN/UR/AR; dark mode; reduced motion; mobile touch; and a real phone if available. Capture the hero, shelf, cards, gifting and full footer. Record the exact test gaps and update the existing tracker and changed-file list.
- Keep the cleanup audit as a separate review. Preserve the four screenshots referenced by the recovery manifest at their original paths. Update archive links for any moved assets referenced by `RENOVATION_HANDOFF.md`. Submit the revised list for review before applying deletions.
- Push the polished homepage to the review branch and report the commit, screenshots and test status. Use PR #17 for integration after the final review.
