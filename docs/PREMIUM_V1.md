# V1 — The AllBarka Table

25 October 2026 (Asia/Karachi). Owner/agent: Codex. SELECTED / DONE for the bounded local V1 slice. Full photography, site-wide typography and release remain separate.

Owner confirmed balanced retail + gifting and existing assets first. Signature Table is the working composition based on that balance. Baseline remote: `2c94349b7754a94b936783b4c85595c66f406a83`, tree `e7edbf1a6992e6a07d38ede76a8fd4e97f45c061`; existing draft PR #16, branch `codex/admin-catalog-foundation-20261023`. No merge/deployment or live data change.

## Bounded scope and acceptance

M01: responsive hero, clear retail/gift actions, stable/resilient media, separate search/categories/guide with original behavior preserved. M02: working direction and owner's priorities recorded. M03: inventory/reuse existing assets only; original merchant photography remains pending. M04: hero/discovery typography plus narrow overflow fixes; full site typography remains pending. Preserve published Studio text/images/actions, EN/UR/AR, themes, reduced motion and one homepage product showcase.

## What changed

- Existing AllBarkaHero now presents ivory/emerald editorial copy alongside a nut/fruit still-life and small gift cue. It retains discovery state in a separate section; no duplicate providers or component.
- CategoryQuickPills gains an editorial variant while preserving every category/search pair. Search keyboard Escape returns focus; arrow-up from the input selects the last suggestion. Search submit target is 44px.
- Existing Studio configuration still supplies published hero copy, mobile/desktop images and destinations. Custom published artwork is not combined with the default gift inset. Studio fallback preview copy/image match the new default.
- Image failure retains geometry and readable copy/actions. A successful picture source load restores visibility after a failed mobile source. Default supporting gift is concept imagery, captioned as inspiration.
- Header utility rows can wrap at enlarged text; showcase controls have bounded widths and 44px targets. No showcase order, product count, price, variant, availability, cart or checkout change.
- Existing hero-specific washes/duplicate logo/gradient text styles are removed from this surface. Existing fonts/tokens and distinct EN/UR/AR copy remain. No new dependency, raster manipulation, category assignment, backend schema, permissions or keys.

## Asset ledger

| Existing path under public | Dimensions / use | Provenance / limit |
| --- | --- | --- |
| images/dryfruit_flatlay_hero.webp | 1400×781; 166 KiB desktop still-life | Existing editorial asset; merchant-shoot provenance unverified; not an exact SKU contents claim. |
| images/dryfruit_flatlay_hero_mobile.webp | 800×447; 81 KiB mobile crop | Existing responsive counterpart, same limitation. |
| images/generated/gift-box-1.webp | 640×640; 51 KiB supporting gift cue | Existing generated concept, not proof of supplied packaging. |

No product record image was replaced. The previous wide/mobile generated hero remains available to existing Studio settings. Rejected the baked-text hero composite; replaced an exploratory 329 KiB gift JPG with the existing 51 KiB WebP before this checkpoint. This is transfer-size accounting, not a field Web Vitals measurement.

## Review and findings

Method: self-review of final diff and real-route browser evidence. No independent/CodeRabbit review claimed.

| ID | Finding / severity | Resolution |
| --- | --- | --- |
| V1-R01 | Discovery expanded to intrinsic category-track width / medium | Explicit section width/min-width; normal responsive matrix checks document overflow. |
| V1-R02 | Search Escape/focus and arrow-up behavior / medium | Restore input focus, allow reopening, correctly focus the last suggestion; keyboard navigation test. |
| V1-R03 | Search submit smaller than 44px / medium | Scoped 44px submit control; matrix measures it. |
| V1-R04 | Failed responsive image could remain hidden at a working breakpoint / medium | Restore visibility on load; failed mobile to valid desktop test. |
| V1-R05 | Header utilities, showcase controls and the unbroken showcase heading overflow at enlarged text / medium | Wrap header rows, bound showcase controls, allow long heading words to wrap; retain 44px targets. 200% root text check passes. |
| V1-R06 | Large supporting gift JPG and stale Studio default preview / low | Existing compact WebP; matching preview default. |

Earlier exploratory test fixture corrections: tsx named browser helper acquired an unavailable `__name`; use self-contained browser expressions. A broad PDP locator matched related-product buttons; exact product URL is retained. Return journeys now wait for real navigation rather than querying an outgoing React page. Computed font-size is awaited before 200% checks. No acceptance assertion is deliberately weakened.

## Continuity incident

An interrupted design attempt was not saved to GitHub and the local workspace reset on resume. Its screenshots/logs were lost. This checkpoint reconstructs the inspected design and reruns verification; lost outputs are not claimed as current evidence. Rules/planning files already saved in PR #16 were preserved. Always inspect the saved remote checkpoint before resuming.

## Catalog / external gates

Live catalog revision UNKNOWN; no configured Firestore read tool or current authorized merchant export available. Live category reconciliation BLOCKED. No mapping or records changed. The fixture suite checks existing classification, aliases and discovery; a current live catalog audit cannot be inferred. Original Stage 6 Firebase/Auth/Storage/n8n/order/deployment blockers remain unchanged.

## Verification and delivery

Source hash: `1317a7c9d04992cd7fe5d150f4060ad0d20fdce86c1c985b5c44e29b78e21cbc`. Runtime Node 24.22.1, Chromium 153.0.8010.0 via existing `ALLBARKA_TEST_BROWSER`; `ALLBARKA_SKIP_LOCAL_ENV=true`. External resources blocked in browser fixtures; local Amiri/Noto Nastaliq fonts loaded, English system fallback exercised. No live provider certification or Web Vitals score.

| Gate | Result |
| --- | --- |
| `npm run typecheck` / `npm run lint:hooks` | PASS, exit 0 |
| `ALLBARKA_SKIP_LOCAL_ENV=true npm run build` | PASS, exit 0; privacy audit 84 text artifacts. Existing >500 kB bundle advisory remains. |
| `node --import tsx --test tests/premium-hero-browser.test.tsx` | PASS, 1 integrated test: 30 viewport/language/theme layouts, 360/390/768/1024/1440px, keyboard search/Escape/arrow navigation, empty search, category/PDP and retail/gift routes, guide focus, 200% root text at 360/1440, landscape, custom published content, image failure/recovery and touch with cold image/font failure. |
| `node scripts/run-all-tests.mjs` with the environment above | PASS, exit 0: 706/706 tests in 73 files, 21 backend and 36 production checks. |
| Catalog asset audit | PASS: 97 fixture products, 115 views / 111 unique views, zero missing or retired assets. Live catalog audit remains BLOCKED. |
| Final diff / source review | PASS; no unresolved in-scope high/medium finding. Self-review only. |

The first complete run had 705/706 passing: the new failure test sampled pre-resize geometry (219.30px) before the layout settled to 269.22px. The fixture now waits for Playwright's stable element geometry before measuring. Focused rerun and the complete rerun pass without removing the fixed-height assertion. Other original tests were retained.

Before views were recaptured from the verified baseline source; current source bytes were then restored and rebuilt before the final full suite. Six inspected JPGs and `layout-matrix.json` are in [evidence/premium-v1](evidence/premium-v1). Before/after English views use equal viewport sizes and fallback-font conditions. Screenshots are fixture-backed, not deployed pages.

### Delivery checklist

- [x] Bounded V1 acceptance complete; broader M03/M04/M23/M32 work remains explicit.
- [x] Final diff self-reviewed; in-scope findings corrected/rechecked.
- [x] Local automated/browser gates evidenced; integration gates not claimed.
- [x] Catalog source/fixture scope separated from BLOCKED live audit.
- [x] Existing commerce/privacy/localization preserved by source review and regression suite.
- [x] Master plan, handoff, changelog and next action updated.
- [x] Remote source checkpoint `7b35e5e9cfbe4fe7188f1f95a856692729beaf91` verified in PR #16. Tree `d4270124203bb6d1eba07d0ea341b8e159596c13` contains 883 blobs: all 874 upstream paths preserved, 19 intended existing files changed, 9 added, zero deletions/unexpected changes. Candidate hashes were compared before an expected-parent fast-forward update; saved head/tree/parent were read back. This following documentation-only commit closes the save record.

Release state: feature branch only; not merged, deployed or live-certified.

## Next scope

Full M03 original photography, full M04 page typography, M23 crop/focal-point controls and M32 full-page Studio preview remain pending. Existing Studio preview is a content preview, not an exact replica of the whole homepage. Proposed V2 collection/product-card layouts, PDP and gifting builder/destination are subsequent work; do not mark them complete from this hero slice. Keep the original Stage 6 blockers separate.
