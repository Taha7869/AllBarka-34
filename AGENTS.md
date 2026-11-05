# AllBarka — repository entry for AI agents

5 November 2026 — **VOICE-02 planning checkpoint:** owner selected the corrected approach for website and WhatsApp and deferred implementation to their PC session. Current VOICE-01 limits remain unchanged; 45s capture and WhatsApp adaptation are TODO. PR16 merge run41909530222 failed two non-voice tests (833 pass / 2 fail / 1 skip); root causes remain unconfirmed. Read the [current plan and evidence](docs/execution-2026-11-04/VOICE_02_PLAN_2026-11-05.md) before following the historical results below.

5 November 2026 — CI-GALLERY1 / CI-VOICE-SYNC1: gallery diagnostics saved02fa4a2; committed hero voice assertion saved203623404979b52837963c4750d7724acdfec305. Latest typecheck/hooks/build/privacy, affected gallery3/3 and voice9/9, full835PASS/0FAIL/1 emulator SKIP across106 files plus21 backend,97-product/115-reference asset audit and36 production checks PASS locally. Hosted outcomes are recorded separately in the execution evidence; historical404 trigger and real provider/device/merchant/live gates remain open. [Evidence](docs/execution-2026-11-04/GALLERY_VERIFICATION_2026-11-05.md).

Hosted source4065e35 verification subsequently completed PASS:834 tests,0 failures,1 emulator-only skip across106 test files, plus backend/assets/36 production checks; run41851671404. This does not erase the local gallery404 or verify real providers/live. [CI](https://github.com/Taha7869/AllBarka-34/actions/runs/41851671404).

Previous application source: 4065e357633586f186143191282c5809584e6f9a. The continuation above supersedes the earlier execution-environment blocker; historical results remain in [FINAL_STATUS.md](docs/execution-2026-11-04/FINAL_STATUS.md). Do not claim release-ready from fixture or CI checks.

## Mandatory entry and current branch

Read [instructions.md](instructions.md), [RULES.md](RULES.md), [MASTER_PLAN.md](MASTER_PLAN.md) and the [current handoff](docs/admin-expansion/HANDOFF.md) before editing. [instruction.md](instruction.md) is only an alias. These guides describe evidence and process, not a guarantee of zero defects.

Working branch: codex/admin-catalog-foundation-20261023; [draft PR #16](https://github.com/Taha7869/AllBarka-34/pull/16) targets launch. Baseline inspected 4 November 2026: 47f9acde89d58a7a25a122ed80252d51d0f0f4f2. Fetch the actual current HEAD; do not equate default main, working branch and deployed build.

The older repository verification helper defaults to feat/renovation-v2 unless explicitly instructed otherwise. The owner's explicit branch selection above is that override; do not switch branches because of the historical helper default. Its relevant verification/safety gates still apply.

## Actual architecture and source map

- React19 + TypeScript, Vite6, React Router7, Tailwind4, motion12 and lucide-react. Exact versions/commands are in [package.json](package.json) and package-lock.json.
- Node >=22.12 <25 / npm11; CI uses Node24. Express server.ts, Firebase Admin + client Firestore/Auth/Storage.
- Storefront: src/pages; shared components: src/components; state: src/contexts; types: src/types.ts.
- Product seed/reference data: src/data/products.ts. Live prices: validated Firestore/server projection through src/lib/catalogStore.ts and catalogSchema.ts. Seeds are not current merchant approval.
- Catalog taxonomy: src/config/categories.ts and src/lib/catalogConfiguration.ts. Read [component inventory](docs/COMPONENTS_INVENTORY.md) before adding a component.
- Admin catalog: src/lib/catalogRouter.ts + catalogStore.ts; Add/Edit: src/components/AdminItemForm.tsx; preserve revisions, draft privacy, templates/options/translation and staff orders-only boundaries.
- AI browser client: src/services/aiConcierge.ts -> /api/concierge/chat. Server: src/lib/aiChatRouter.ts -> src/services/n8nAIConsultant.ts. Provider keys remain server-side; no browser localhost/Ollama requirement. Optional voice: src/components/VoiceInputButton.tsx -> src/services/voiceInput.ts -> /api/concierge/transcribe -> src/lib/voiceRouter.ts and voiceTranscription.ts; setup/evidence in README-AI.md and docs/execution-2026-11-04/.
- Commerce/outbox/provider contracts: [INTEGRATIONS.md](INTEGRATIONS.md). Existing website/WhatsApp order channels remain separate until an explicit integration change.
- Tests: tests/; full offline runner: scripts/run-all-tests.mjs; production artifact/privacy checks run during npm run build.

## Routes and design

Existing customer routes include /, /shop, /shop/:category, /category/:category, /wholesale, /gifting, /product/:id, /cart, /checkout, /success, /pages/:slug, /story, /contact, /policies, /policies/:slug, /journal and /faq. Verify route additions in actual routing source rather than treating this overview as exhaustive.

[design.md](design.md) defines accepted Signature Table / Gift Atelier direction. Actual token values live in src/index.css: use semantic variables, existing logo/fonts and restrained gold detail. Preserve Playfair Display, Inter, Amiri; light/dark, EN/UR/AR RTL, readable body contrast, 44px controls, mobile/desktop and reduced motion. Keep one homepage showcase and published section controls; do not invent an exact four-section or 50/50 rule.

## Non-negotiable working boundaries

- Follow RULES R05 for canonical prices, shipping/coupons, MOQ, preparation and receipts; never change server pricing policy to resolve an assumed data anomaly.
- Staff can view orders only; server APIs enforce roles. Never expose supplier/internal/draft data or keys.
- Confirm orders only after durable accepted state. Product facts/reviews/certification/physical contents must be supported.
- Owner says Railway is unpaid/offline; live gates await reactivation. Box 3D is deferred. Printing capability exists but samples are not ready. VOICE-01 code and isolated tests are present; real free-plan/provider/phone checks remain pending.
- Reuse existing code/components; explain any new dependency before installation. Preserve unrelated work and all stable M01–M34 meanings.
- Run the required impact-based gates in instructions.md/RULES R08, including npm run build for documentation work. Distinguish local, hosted CI, fixture preview, real provider and live evidence.
- Log every actual deletion or archive in [trash.md](trash.md). Do not blindly remove configuration, tests, history or assets. Review, verify the remote parent, save scoped changes and verify read-back before delivery.
