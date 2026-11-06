# Admin finishing pass — 25 October 2026

Inspected remote parent: `4772d983373cd51a2186e7e674ec800521c19802`. Owner reconfirmed that existing Firebase and all other keys/configuration remain unchanged, and requested completion of feature/polish upgrades. This is a bounded usability addition within Stage 6; Stages 1–5 and P0–P3 are retained, and live integration/release gates remain separate.

| ID | Acceptance behavior | Status |
| --- | --- | --- |
| F01 | Quickly reach item identity/options/photos/SEO/logistics/private/review/configuration sections on mobile and desktop; open collapsed sections and place keyboard focus intentionally | DONE locally |
| F02 | Protect unsaved item and taxonomy/template edits on close, Escape and browser reload; saving either scope must not silently clear the other's unsaved state | DONE locally |
| F03 | Prevent dismissal/competing item mutations while a configuration save is pending; preserve failed edits and expose errors with useful focus | DONE locally |
| F04 | Preserve required/optional labels, drafts, explicit publish, localized EN/UR/AR controls, canonical prices and existing upload/commerce behavior | DONE locally |
| F05 | Verify actual mounted form at 360/390px and desktop, dark/light, RTL, keyboard/reduced motion and enlarged text; record real regressions/fixes | DONE locally |
| F06 | Full type/hooks/build/privacy/regression checks, updated requirements/handoff/changelog and scoped GitHub checkpoint | DONE locally; current saved successor is draft PR #16 |

Reuse AdminItemForm, AdminCatalogConfiguration, ItemField and existing design/translation tokens. Do not add a second editor, draft database or dependency. No new key, application environment edit, live workflow/order/account write, rule publication, production merge or deployment is authorized. Key replacement alone will not certify provider permissions, durable acceptance or release behavior; those checks remain explicit in STAGE6_PROGRESS.md.

## Implementation and actual focused evidence

The existing editor has eight section shortcuts: native mobile selector and desktop gold-edged controls. They open collapsed details, scroll the existing form and focus the target heading/summary; there is no second route or copied form state. Native sections, mandatory/optional markers and existing item operations remain intact.

Item and category/template edits now retain independent unsaved state. Close/Escape confirms discard, and a real browser reload can be cancelled without losing input. The unload guard reads synchronously updated refs so a configuration-only change is protected immediately. Configuration saves disable dismissal and competing item actions through the subsequent catalog refresh; replacing the settings revision occurs after that refresh. Item save/publish remains disabled while configuration edits are unsaved, with a localized explanation, preventing the create modal's normal post-save close from discarding that independent draft. Saving configuration does not clear unsaved item changes.

Item/configuration error summaries receive focus and scroll into view. Failed/stale saves retain entered values. Existing emerald/ivory/gold tokens, minimum 44px shortcut controls, mobile section selector, footer safe-area padding, enlarged-text wrapping and reduced-motion scrolling are preserved/refined. No server pricing, storage path, permission or persistence schema is changed.

Focused browser gates passed: original Stage 3 create/upload/publish/custom-cart workflow and new finishing test (2/2). The new fixture covers 360×800, 390×844 and 1440×900 × EN/UR/AR × dark/light (18 layouts), plus 200% computed text/control-size checks at 360/1440, keyboard focus, real cancelled reload, close/Escape, independent config-only edits, held PUT and held refresh, actual revision conflict and focus restoration. The sole intentional 409 is the only expected browser console error. Auth, Firestore and upload remain isolated adapters, not live provider certification.

Two inspected screenshots in evidence/: `admin-finish-1440-en.jpg` and `admin-finish-360-ur.jpg`. They show the actual mounted editor with fixture data and section navigation; they are not screenshots of a deployed private workspace.

## Failures and corrections

The first browser run caught configuration-only beforeunload protection not becoming active immediately through passive state propagation. Dirty/busy callbacks and ref-based unload checks now update synchronously. The original browser's unscoped text selector became ambiguous after adding real section shortcuts; it now targets the existing SEO summary specifically without weakening the saved-field assertions. A cancelled `page.reload()` waits for a navigation that intentionally never commits; the fixture now issues Chromium's reload command directly and still verifies the native beforeunload dialog, dismissal and retained field value. The configuration revision swap is deferred until refresh completes so an unmount cannot clear a newer editor's unsaved flags during an unfinished save.

## Final checkpoint gates

Typecheck, hooks lint, production build/privacy audit (84 text artifacts), catalog asset audit and diff check pass. Full offline suite: **705/705 tests across 72 files**, 0 failed/cancelled/skipped, **21 backend** and **36 production** checks. Existing bundle advisory remains. Original Add/Edit item, custom commerce, staff/content and connected n8n handoff regressions remain included. Source/screenshots/docs are saved together to the existing feature branch/draft PR, preserving remote ancestry and unrelated files; inspect PR #16 for the successor of the pinned parent.

All F01–F06 gates are locally complete. Next work is the existing authorized-environment live verification in STAGE6_PROGRESS.md; no new keys are requested and no real provider result is inferred. The page-refresh warning is browser-owned and can be suppressed by a browser, particularly after mobile process termination; this pass does not create local draft autosaves or guarantee recovery after a crash.
