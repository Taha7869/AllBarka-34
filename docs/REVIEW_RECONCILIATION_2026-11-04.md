# Review reconciliation and owner decisions — 4 November 2026

Baseline: 47f9acde89d58a7a25a122ed80252d51d0f0f4f2, codex/admin-catalog-foundation-20261023, PR #16 against launch. This is source/document review, not a fresh merchant database audit. Source/reference prices below are not current Firestore evidence or approved corrections.

## What the Gemini review usefully found

| Item | Source fact at baseline | Disposition |
| --- | --- | --- |
| pumpkin_seeds | products.ts:540 has 100g=500, 250g=400, 500g=800, 1kg=1600 | Flag for merchant price/option review before value promotion. No Rs160/180/200 rate or option deletion approved. |
| bundle-daily-grind | Source describes 3x250g badam/kaju/green kishmish; reference component sum 950+950+365=2265 versus bundle2400 | Source difference135 is a price-transparency review, not proof of a loss or bug; actual cost/packaging/current merchant prices are unknown. Do not switch to golden raisins or reduce price to manufacture savings. |
| bundle-tasting-flight | Source entry at products.ts:1587 is Bundle1000 and four100g selections confirmed before dispatch | The review's Rs2200/alternate Rs2850 narrative is not established for this immutable entry. Its cost example uses a different mix from Codex's proposed badam/kaju/khajoor/kishmish. Exact contents, packaging cost and approved price remain pending; no dual-packaging option selected. |
| Date IDs | khajoor is the specific dark-date shortlist ID; ajwa-dates/medjool-dates have conflicting name/origin prose | Keep IDs distinct; do not relabel ajwa-dates as proven Muzafati or medjool-dates as proven Panjgur without merchant facts. Source text is itself disputed. |
| Price-audit extension | Current catalogHealthReport has other price/readiness checks; these new warnings need a specified comparison scope | Proposed M34 extension only. Compare eligible compatible quantities/options, explicit discounts/packaging and exceptions. Warn for review, do not auto-correct or enforce invented universal price laws. Retail price comparison cannot establish margin without cost data. |

A larger pack need not have strictly greater total price or lower unit price in every merchant situation (promotion, grade, pack type or service). No 'zero false positives' guarantee or mandatory three repeated complete-suite runs is imposed by this review. Use scoped meaningful acceptance and justify repeated runs by unresolved risk.

## Corrections to blanket completion / IDs / layout

- M03 authentic media, M04 broader typography, M05 remaining content, M08 physical arrangement, M09 supported printing handoff, M16 richer recipient discovery and real provider gates remain incomplete. Preserve locally completed slices; do not mark the entire roadmap finished.
- Local history records 821 pass, 0 fail, 1 skip. Hosted baseline run [41645560854](https://github.com/Taha7869/AllBarka-34/actions/runs/41645560854) records819 pass,2 fail,1 skip. Distinguish them. Neither a Studio fixture nor a written outbox contract is real provider certification.
- Actual failures are tests/admin-passport-browser.test.tsx:301 and tests/error-surfaces.test.tsx:390. Existing transactional reads and RTL bindings rule out 'missing feature' assertions, but do not prove a timing/hydration root cause. Reproduce and trace; do not weaken assertions or add arbitrary delays.
- M31 means local-language product finding, not SEO; M32 means Studio preview/restore, not Railway ingress. Infrastructure belongs to Stage6. RULES R04 covers catalog reconciliation; R03 covers review.
- HomePage has a banner/hero, six configurable section entries (collections, showcase, occasions, care, reviews, faq) plus assurance/ribbon content. Four example components do not establish an exactly-four-section contract. Keep published section order/visibility and one showcase.
- Source styles are authoritative for token values. Do not import unverified alternate palette hex values from prose.
- 'Custom print available on bulk orders' and 'ready-to-ship' are not universal approved claims. Record accurate preparation/order mode, supported treatment and truthful reference-image labels.

## Owner decisions

Railway payment unpaid/offline; live verification resumes after owner reactivation. Box 3D is deferred. Product selection delegated: visually attractive/value candidates, not new seed prices. Printing capability available, no physical samples prepared. Preserve balanced retail/gifting, existing assets first, Signature Table, mobile/EN/UR/AR/dark mode and existing business contracts.

Shortlist candidates: pista, kaju, badam, khajoor, khubani, pumpkin_seeds (price issue pending); bundle-tasting-flight for discovery and bundle-daily-grind for larger everyday use (component/value review pending). Candidate Tasting Flight contents are badam+kaju+khajoor+kishmish,100g each, not a publication instruction or committed mix/price. Current merchant pricing and costs decide feasibility.

VOICE-01 selected, implementation TODO: Groq free-tier Whisper input into existing AI Buddy/search; mic user-triggered, editable transcript, Urdu/English product/amount accuracy tests, optional tested device speech output, typing fallback and no paid upgrade/fallback. Server-side secret, upload/time/quota/cancel bounds; no default retained raw audio. Provider availability/free-tier account/model access and actual quality remain to verify. Sources consulted: [Groq speech](https://console.groq.com/docs/speech-to-text), [limits](https://console.groq.com/docs/rate-limits), [browser voices](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices).

## Next work

1. Reproduce the actual hosted failures under the locked environment; save observed revision/request and language-state traces, then minimum justified fix.
2. Finish scoped M04/M05/M16 work with existing components and typed recipient data; do not repurpose printing notes.
3. Merchant data/price/contents/printing review. M34 price warnings and dual-packaging remain proposals, not automatic rules or approved prices.
4. Implement selected VOICE-01 in its own reviewed slice.
5. Isolated provider/physical-device/SEO/performance checks; live release remains separate.

No product price/content, runtime behavior, permission, credential, live data, workflow or deployment changed in this reconciliation. Cleanup and guide changes are documented in [verification](CLEANUP_VERIFICATION_2026-11-04.md) and [trash ledger](../trash.md).

