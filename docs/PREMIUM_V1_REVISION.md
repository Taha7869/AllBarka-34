# V1 revision — character and motion

27 October 2026 (Asia/Karachi). Owner/agent: Codex. SELECTED / DONE for the bounded hero/collection presentation and motion revision, locally verified. Broader page upgrades and owner aesthetic acceptance remain open; not deployed.

Owner found the first V1 flat and asked to use premium internet/motion references. Preserve retail + gifting balance, existing assets first, keys/configuration, EN/UR/AR, dark mode and the single showcase. Baseline `599d13461db796a8f6ad73bbf44910d7ec3a78ab` / tree `b00ff54ea485b259dc094f07f12396b0bdebb728`; PR #16, branch `codex/admin-catalog-foundation-20261023`.

## Scope and acceptance

Reopen M01/M02; bounded M04/M05/M06/M21: full emerald hero, ivory/gold editorial typography, arched existing still-life/gift imagery, existing crest, quieter discovery, matching collection framing, existing assurances/ribbon after configurable sections. Add finite 900ms photo settle, 700ms gift settle, fine-pointer photo zoom and directional arrow feedback. All content/actions remain immediately visible; reduced-motion is static and custom published art excludes default ornaments/entrance. Existing carousel, page reveals, gallery and cart behavior remain authoritative.

Check real-route before/after screens at 360/390/768/1024/1440, EN/UR/AR, both themes, 200% text, keyboard/touch, custom Studio art, failed imagery, search/category/gift journeys, normal/reduced motion. Run type/hooks/build, targeted and full offline regressions. No new dependency or raster asset.

## References checked 26 October

- [Simply Chocolate / Awwwards](https://www.awwwards.com/sites/simply-chocolate): product-led food ecommerce and animation inspiration; historical 2017 award, not a current-site implementation audit.
- [Butlers / We Are Folk](https://www.wearefolk.com/butlers-chocolates): large editorial photography, typography and brand identity carried into ecommerce.
- [Codrops product-grid preview](https://tympanus.net/codrops/2025/05/27/animated-product-grid-preview-with-gsap-clip-path/): considered image-led motion; AllBarka uses a restrained original implementation, not the tutorial's hover-dependent grid takeover. No code/assets copied.
- [Motion accessibility](https://motion.dev/docs/react-accessibility): reduced-motion strategy. Existing motion stack retained.

## Review / continuity

Self-review only. Category default badges previously followed slide position and could label Dates “Better together” after merchant reorder; now attached to destination IDs, explicit merchant badges retained. Fix badge contrast using existing ivory/deep emerald. Dates gets an existing generated date illustration as a presentation-only fallback; no product reclassification. No server, price, schema, permission or key change.

The prior unsaved visual revision and its local logs were lost when the workspace reset on user resume. Reconstructed from the conversation; old passing outputs are not current evidence. The prior full run had one timing failure: viewport geometry sampled stale desktop styles before the new mobile frame painted. Keep all assertions and await a painted frame before measuring on rerun. Capture fresh evidence for this source.

## Catalog / release

Current live watermark UNKNOWN; no Firestore read tool/current authorized export. Live audit BLOCKED. Preserve source/fixture taxonomy and all prior Stage 6 Firebase/Auth/Storage/n8n/order/deployment blockers. Generated gift/collection pictures are inspiration, not delivered-contents proof. No production merge/deploy or live writes.

## Verified gates and next action

Recovery source was saved at `30438be512ac433dfcfb59a911137ec00d46f2f9` (tree `79bf777b1c4c9252c0d5b14d2a1bbd80cc10c0f1`), read back after expected-parent fast-forward. That checkpoint preserved all 883 baseline paths and added this task record. The verified successor adds the regression tests, six screenshots, layout matrix and final records. Inspect the commit containing this version and PR #16 for its exact saved identity; do not confuse local snapshot history with upstream ancestry.

Final runtime source hash: `52ea4931dd88def56c0a2eeff7a318b0f1c1132858cfd2560598f8fa20e17238`. Dependencies restored with unchanged lockfile; Chromium 153.0.8010.0 is a test-only executable outside the repo. Browser commands use `ALLBARKA_TEST_BROWSER` pointing to that executable and `ALLBARKA_SKIP_LOCAL_ENV=true`. Evidence capture alone also uses `ALLBARKA_CAPTURE_EVIDENCE=true`; no baseline-bypass flag was used.

| Gate | Result |
| --- | --- |
| `npm run typecheck` | PASS, exit 0 |
| `npm run lint:hooks` | PASS, exit 0 |
| `ALLBARKA_SKIP_LOCAL_ENV=true npm run build` after clean generated dist | PASS, exit 0; privacy audit of 84 text artifacts; existing bundle-size advisory |
| `node --import tsx --test --test-isolation=none tests/premium-hero-browser.test.tsx` | PASS, 1/1; fresh screenshot capture; 30 viewport/language/theme layouts and normal/reduced motion |
| `node --import tsx --test --test-isolation=none tests/interaction-polish-browser.test.tsx` | PASS, 1/1 after test timing correction described below |
| `node scripts/run-all-tests.mjs` | PASS, 707/707 across 73 test files, 0 failed/cancelled/skipped; runner completed backend/assets/production stages |
| Backend / production | PASS, 21/21 backend and 36/36 production checks |
| Catalog assets | 97 fixture products, 115 references, 111 unique files; zero missing/retired views |
| Final diff / evidence | Self-review; `git diff --check` PASS; six JPGs inspected; linked evidence present |
| Live catalog, providers and deployment | BLOCKED / NOT_RUN; unchanged Stage 6 external gates |

One preceding full run had 706/707 passing with the existing gallery timing failure (VR05); that run did not reach downstream runner stages. The final complete rerun above supersedes it. Current fixture follows dist/index.html stylesheet links and waits for the actual theme paint before geometry; interrupted builds can leave stale CSS, so generated dist was cleaned/rebuilt. No runtime changes followed these passing gates.

Next: review the saved desktop/mobile design with the owner; continue product-card, PDP and dedicated gifting art direction under their stable task IDs when selected. Preserve this direction and existing functionality; do not repeat the completed hero pass. Original photography, full-site typography, Studio crop controls/full-page preview and live release gates remain pending. Owner aesthetic approval is not inferred from tests.

## Review findings and limits

Self-review of source, mounted journeys and screenshots; no external/CodeRabbit review claimed.

| ID | Finding / severity | Disposition |
| --- | --- | --- |
| VR01 | Opening felt visually flat / owner design feedback | Emerald/ivory/gold, larger editorial type, arched still-life and gift detail, repeated collection shape; visual acceptance remains the owner's judgment. |
| VR02 | Position-based badges mislabeled reordered categories / medium | Default label follows destination ID; explicit merchant labels preserved; reordered-category regression added. |
| VR03 | Default Dates panel had no image / low | Reused generated date illustration for category presentation only; no mapping/merchant data change. |
| VR04 | Resumed build contained old CSS alongside the current entry; theme/viewport screenshots could sample a transition / test infrastructure | Clean rebuilt generated dist; hero fixture reads only current index stylesheet links, awaits the actual header theme color and a stable painted frame before geometry. Original assertions retained. |
| VR05 | Existing gallery test pressed Previous while its optimistic counter had changed but native scroll had not arrived / test infrastructure | Isolated unchanged journey passed; fixture now verifies physical arrival after Next and physical return after keyboard Previous. No gallery runtime changed. Rapid repeated reversals are not certified by this scoped test. |

Runtime changes: AllBarkaHero.tsx/CSS, CategoryCarousel.tsx, HomePage.tsx and editorial.css. Tests extend existing hero/pantry/interaction suites. No application dependency, original image edit, product price/stock/status update, backend/permission/config change. Studio still controls published text, imagery and actions; full-page preview/crop controls remain pending.

New hero text contrast on emerald: ivory 11.99:1, gold 7.55:1, muted copy 8.55:1; primary label on gold 9.46:1; gift caption 6.45:1. Scope is these colors, not an entire-store accessibility certification. No field performance score or original merchant photoshoot is claimed.

Before: [V1 desktop](evidence/premium-v1/after-1440-en-light.jpg), [V1 mobile](evidence/premium-v1/after-390-en-light.jpg). After evidence: [desktop](evidence/premium-v1-revision/after-1440-en-light.jpg), [mobile](evidence/premium-v1-revision/after-390-en-light.jpg), [Urdu dark](evidence/premium-v1-revision/after-390-ur-dark.jpg), [Arabic dark](evidence/premium-v1-revision/after-1440-ar-dark.jpg), [desktop collections](evidence/premium-v1-revision/collections-1440.jpg), [mobile collections](evidence/premium-v1-revision/collections-390.jpg), [layout matrix](evidence/premium-v1-revision/layout-matrix.json). Local fixture screens with equal viewport sizes/fallback-English-font conditions; the date-dependent dispatch banner differs. Six JPGs inspected. Existing gift concept remains captioned inspiration; category pictures do not promise exact box contents.

## R11 delivery checklist

- [x] Bounded scope/acceptance locally complete; broader proposals and aesthetic acceptance remain open.
- [x] Final diff self-reviewed; VR01–VR05 dispositioned and relevant regressions passed. No unresolved critical/high finding in this diff.
- [x] Required local automated/browser gates evidenced above; live integrations explicitly unrun/blocked.
- [x] Catalog presentation/category fixtures checked; current live watermark UNKNOWN, live classification audit BLOCKED, no data writes.
- [x] Commerce, privacy, roles and EN/UR/AR/theme behavior covered by retained regression gates; no changed backend contracts.
- [x] Master status, handoff, testing record, decisions/limits and changelog updated.
- [ ] Final successor remote tree/ref readback: complete and record exact commit before delivery. Branch is PR #16; no production merge/deploy.
