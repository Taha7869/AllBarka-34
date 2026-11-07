# Studio preview visual evidence — 3 November 2026

Baseline upstream: `4a45fc4b92db048969885af022fc64afec043a00`.
Baseline AdminContentPanel blob: `81c324423eb7d09e33bb7ab31a621654c4f8ead5`.
Changed AdminContentPanel blob: `ba451ba049720b76d8c60336af31115b31ca3705`.

The before capture substitutes the verified baseline component into the existing `tests/batch-d-browser.test.tsx` esbuild fixture. The after capture uses the changed component. Both use the same isolated in-memory catalog/content routers and synthetic owner identity, English authored hero content, host language/theme providers, reduced motion and CSS build. No live merchant draft or private data appears.

Desktop captures expose the whole frame in a 1600×1200 fixture host with its width restriction removed; the changed iframe's actual desktop viewport is 1440px. In a narrower editor, the frame remains 1440px and its parent scrolls horizontally. Mobile captures use the 390px preview after selecting Arabic/dark in the host. The English fixture hero remains the configured fallback; shell/FAQ translations and document direction/theme change normally. Physical browser/device safe areas are not certified.

Files:

- `before-desktop-en-light.jpg`
- `after-desktop-en-light.jpg`
- `before-mobile-ar-dark.jpg`
- `after-mobile-ar-dark.jpg`

The images are native browser JPEG captures (quality 78), visually inspected. Real iframe content, draft/live/restore, three viewport widths, six language/theme combinations, prevented link navigation and unchanged host metadata have automated assertions in Batch D. Routine tests do not regenerate tracked screenshots; opt-in fixture capture uses `ALLBARKA_CAPTURE_EVIDENCE=true`.
