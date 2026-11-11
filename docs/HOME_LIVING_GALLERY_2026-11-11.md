# HOME-LG1 — Living Gallery homepage pass and cleanup audit

11 November 2026 (Asia/Karachi). Agent: Claude (Anthropic), cloud session; self-review only, no independent reviewer.

```text
Task ID and scope:   HOME-LG1 — presentation pass on the existing homepage; CLEAN-AUDIT-02 — audit of 92 candidate paths
Branch + parent:     claude/home-approved-20261111, from codex/premium-table-kit-20261108 @ 261888ddcf9a (draft PR #17 head, confirmed by ls-remote)
Resulting commits:   design aa2402a; record and evidence f083c36; this status correction in the following commit
Status:              scope SELECTED (owner instruction 11 Nov) / work DONE for the items below / local verification PASS / hosted CI NOT_RUN / live NOT_RUN
Release state:       pushed to review branch origin/claude/home-approved-20261111 (an earlier 403 cleared on 11 Nov); PR #17 branch untouched; not merged, not deployed
```

## Source of the design brief

The owner's 11 November instruction lists: spacious emerald hero with desktop/mobile film and both CTAs, compact AI/search bar with mic, round travertine carousel, large-photo cards with separate Add to Bag / Quick View / View Details, Gift Atelier, full emerald footer. **No locked reference images, TODO board or tracker for this design exist on the remote branch** (searched docs and evidence folders), so the pass follows that written list, `design.md` and `docs/ANTIGRAVITY_HOME_VISUAL_BLOCK_2026-11-10.md`. Owner aesthetic acceptance against the original references is therefore NOT_RUN.

## TODO board

| Item | Status | Notes |
|---|---|---|
| Emerald, more spacious film hero, both CTAs | DONE | Colour and spacing only; film, poster fallback, pause control and reduced-motion behaviour unchanged |
| Black bar on right edge of desktop film/poster | DONE | The bar is baked into `signature-table-desktop-v2.mp4` and its poster (last ~14px of 792); clipped by widening media to 103% |
| Compact search / voice / guide bar | DONE | Same controls and handlers; tighter rounded layout |
| Round travertine collection carousel | DONE | Round tiles on a CSS-drawn stone surface (not a photograph), light and dark; existing curve motion, arrows, swipe kept |
| Large-photo showcase cards, three separate actions | DONE | Homepage cards only; Quick View and View Details moved into a two-button row under Add to Bag in the shared `ProductCard` |
| Gift Atelier emerald panel | DONE | Same image, copy and both actions |
| Full emerald footer | NO CHANGE | Already present on the PR head |
| Higher-resolution hero film | TODO (owner asset) | Current film is 792×414 and soft at 1440px; a replacement must come from the owner |
| "AI" entry inside the search bar | TODO (owner decision) | The bar exposes search, mic and the selection guide; the AI Buddy stays on its floating button. Confirm if it should move into the bar |
| Shop-grid cards (`table-catalog-card`) | NOT IN SCOPE | Unchanged |
| Cleanup of audited paths | BLOCKED on owner approval | See [audit](CLEANUP_AUDIT_2026-11-11.md); zero files removed |
| Recovery branch `claude/cleanup-junk` | KEPT | Old commits 5b8a3e4, 82f7572, b91c223 and the `three` dependency stay there only |

## Changed files (design commit aa2402a)

- `src/styles/living-gallery-home.css` — new, scoped to `.editorial-home` except `.table-card-actions`
- `src/main.tsx` — one import
- `src/components/CategoryCarousel.tsx` — three class names added (`pantry-tile-label`, `pantry-tile-arrow`, `pantry-tile-badge`)
- `src/components/ProductCard.tsx` — Quick View and View Details rendered in a `table-card-actions` row; same handlers, same `/product/:id` link, same translation keys

No new dependency, customer string, route, price, shipping, cart or checkout change.

## Verification (local, Node v24.22.1, Chrome via ALLBARKA_TEST_BROWSER)

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint:hooks` | exit 0 |
| `npm run build` | exit 0; release privacy audit passed (85 text artifacts) |
| `node scripts/run-all-tests.mjs` (run on final design commit aa2402a) | exit 0; 863 tests: 862 pass, 0 fail, 1 skipped; 110 test files plus backend suite; assets 97 products / 115 references / 0 missing; 36 production checks passed |

Browser inspection of the built site (`vite preview`, seed catalog, no live API): 1440×900, 390×844 and 360×640 in EN light; 1440 UR dark and AR dark; 1440 reduced motion. No horizontal overflow at 1440/390/360. Screenshots: [evidence folder](evidence/home-20261111/).

Not run: hosted CI, 768px, 200% text zoom beyond what the existing browser tests cover, real phone, real providers, live Firestore. Catalog reconciliation (R04): N/A, no catalog or taxonomy change.

## Self-review findings

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| LG1-01 | Medium | Reduced-motion poster showed the same black edge as the film | Fixed (poster widened with the film); rechecked by pixel sample |
| LG1-02 | Low | Urdu/Arabic hero grew taller than the viewport with the new padding | Fixed (smaller RTL padding) |
| LG1-03 | Low | Placeholder tile text overlapped the centred label on round tiles | Fixed |
| LG1-06 | Medium | In Urdu/Arabic the mirrored hero showed the film's black bar on the left edge after the first fix | Fixed (media overflow pinned to its own right edge); rechecked by pixel sample in UR dark and AR reduced motion |
| LG1-04 | Low | Full suite rewrites six PNGs under `docs/evidence/error-surfaces/` | Restored; not part of this change |
| LG1-05 | Low | One collection title ("Saunf & Mouth Fresheners") shows in English in Urdu/Arabic | Pre-existing data; not changed |

## Delivery checklist (R11)

- [x] Scope complete for the listed items; owner aesthetic acceptance outstanding
- [x] Final diff self-reviewed; findings above dispositioned
- [x] Automated and browser gates evidenced; unrun gates named
- [x] Catalog audit not triggered
- [x] Commerce, privacy, roles, localisation and existing behaviour preserved (suite green)
- [x] Status, blockers and next action recorded
- [x] Review branch saved to origin and read back; integration branch and PR #17 not modified

Next executable action: owner approves or edits the audit decisions, then a separate cleanup commit applies only approved rows and records each in `trash.md`.
