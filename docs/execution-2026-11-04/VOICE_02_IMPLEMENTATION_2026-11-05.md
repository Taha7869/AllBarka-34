# VOICE-02 — implementation and verification

## VOICE02-LAYOUT1 — additional screen/text verification

After source754d969 was saved, the additional layout pass reproduced a panel edge at x=-1px on360px English and shop toolbar overflow at200% enlarged text (document width521px on390px English, then415px in Urdu). The shared voice panel now aligns its actual layout box within the viewport on open/language/resize/scroll/content resize, with listener/observer cleanup. The existing shop filter/saved row wraps and its saved-label flex item can shrink/wrap without pushing the counter offscreen. Visual inspection then found that a shrinking saved-label flex item could form a letter-width column at200% Urdu. A10rem flex basis now gives the saved control its own wrapped row when needed; an explicit word-readable label-width assertion covers the enlarged cases. No filter/category data or behavior changed.

Expanded committed browser regression: **30/30 layouts PASS** —360/390/768/1440px × English/Urdu/Arabic × light/dark, plus390px × three languages × two themes at200% root text size. Panel bounds, page overflow, word-readable enlarged labels and44px controls retained. The complete voice journey also passes. Initial full838P/0F/1S evidence below belongs to754d969; renewed typecheck/hooks/build/privacy gates PASS. Final full-suite and hosted checks for this layout follow-up are IN_PROGRESS and must be recorded separately. Application source hash: `13e09d08f2f5a7d1e297e5c721fd4dc70efa58767546231e46dae0c269072fb8`. This is an unfinished verification checkpoint, not release certification.

5 November 2026 (Asia/Karachi). Owner follow-up: complete everything available now; leave only actual PC/provider dependencies. This supersedes the PC-only implementation deferral in the [original plan](VOICE_02_PLAN_2026-11-05.md).

Remote parent inspected: `9d6075fe7db16c8c74a57844529959315cb6c517`, branch `codex/admin-catalog-foundation-20261023`, PR16 targeting `launch`. The isolated local baseline has the exact same verified Git tree `f8961b705c2912280bbf255d02ba07ca7bd0e11c`; its temporary local commit identity is not pushed. Final source/docs are saved against the actual verified remote parent with the Git tree API. The containing commit identifies the final saved revision; fetch actual HEAD before continuing.

## Implemented scope

| Area | Before | After |
| --- | --- | --- |
| Website capture | 14s timer / 15s PCM validator | 45s auto-stop and accessible countdown; existing Buddy/hero/shop controls reused |
| Codec/stop overrun | Whole recording rejected above15s | Resampling output bounded before allocation to960,000 samples/60s; longer decoded input transcribes its first60s with a visible excluded-tail warning |
| Upload | One small WAV | Still one WAV;45s=1,440,044 bytes and60s=1,920,044 bytes, both below2MiB |
| Raw capture | 2MiB guard | 4MiB guard; overflow stops recorder/tracks and shows safe recovery, without slicing a compressed container |
| Deadline | One25s preparation/upload budget |15s preparation/token budget followed by a fresh25s upload budget; existing20s server provider deadline remains |
| Transcript review | Provider text over1,000 chars discarded | Up to4,000 chars retained/editable; Use disabled with translated guidance above the existing1,000-char submission bound |
| WAV parsing | Fixed44-byte layout | Bounded RIFF chunk scan, odd-byte padding, PCM16 mono16kHz format checks, unique fmt/data, actual data duration and silence scan; malformed/duplicate/truncated chunks rejected |
| Empty bodies | Validator guard already existed | Explicit router Buffer/nonempty guard, preserving `VOICE_INVALID_AUDIO`400 contract |
| Animated drawer close | Unmount cleanup could wait for exit animation | Parent close effect immediately cancels microphone/request and TTS through the existing controls; unmount, voice-start and text/language cleanup retained |
| Copy | 15s notice |45s notice, excluded-tail/long-text/invalid-audio recovery and countdown label in English, Urdu and Arabic |

`src/lib/voiceLimits.ts` contains public numeric limits only. No provider key/configuration is imported into the browser. The existing server model allowlist/free-tier acknowledgement, optional user auth, rate/concurrency guard,64KiB provider response limit and private-safe error path remain. The vocabulary prompt already contained the requested product/bundle/weight/city terms; only `Rs` was added.

Single-request website processing deliberately avoids unnecessary split/merge, duplicate words and a second quota request. No artificial “two24s chunks cover60s” implementation or zero-failure promise. Server still rejects invalid/over-limit untrusted requests; browser recovery does not relax server bounds. Very large raw containers, denied permission, silence, provider/network/quota failure can require typing or another recording.

## Verification performed

Environment: isolated Linux checkout; Node24.22.1 / npm11.9.0 and available locked dependencies. Initial browser attempt could not launch an old truncated cached executable; re-extracted the existing compressed Chromium153 package into a separate temporary path and verified launch before browser assertions. No package/lockfile/dependency change. All provider/microphone/decoded-sample responses in automated tests are isolated fixtures.

| Gate | Result / exact scope |
| --- | --- |
| `npm run typecheck` | PASS, exit0 |
| `npm run lint:hooks` | PASS, exit0 |
| `npm run build` | PASS, exit0; frontend/server bundles and release privacy audit84 text artifacts. Existing large-bundle warnings remain |
| `node --import tsx --test tests/voice-concierge.test.ts` | PASS11/11:24/30/45/60s, metadata/padding/malformed bounds, actual data silence, non-Buffer/empty input, pre-allocation clamp and warning flag, context cleanup, provider format/errors/quotas, real router guards/deadline, long text and existing product discovery |
| `node --import tsx --test tests/voice-concierge-browser.test.tsx` | PASS1 expanded multi-surface journey: explicit review/no auto-send, hero/shop integration, denied/late permission, raw-size track cleanup,45s single request and countdown,65s warning with bounded output, overlong text preservation, fresh upload deadline after14s preparation, and TTS cancellation while the animated exit is deliberately held mounted |
| Historical CI diagnostic | PASS12/12 locally, unchanged staff and controlled-clock tests. Both affected failures did not reproduce |
| Full `npm test` | PASS, exit0:839 total,838 pass,0 fail,1 emulator-only skip across106 test files; backend21/21, catalog97 products/115 references with0 missing/retired, and36/36 production checks PASS. Node gate514,150ms |
| Visual evidence | Inspected actual shared voice control at390px, Urdu RTL/dark,45s timer and notice,44px targets and in-viewport panel; browser suite retains English flows. Broader physical-device/real-codec matrix remains unverified |
| Diff/links/save | Self-reviewed final source/tests; `git diff --check` PASS. Added documentation links resolve. Scoped22 text files only; generated screenshots excluded. Remote parent/tree/content read-back required before delivery |
| Live catalog | N/A for this source scope: no product/taxonomy/price changes or writes; no live catalog audit claimed |

Browser command environment: `ALLBARKA_TEST_BROWSER=/tmp/allbarka-voice02-browser/chromium ALLBARKA_SKIP_LOCAL_ENV=true`; optional screenshot directory is temporary QA evidence, not a production or live-provider screenshot. Final full runner strips live provider credentials using the existing script. Verified application build source hash: `d4d7d1f4c88f8f393ee02a5d27c5e831a80068ab366b42612b5bac45e54e313a` (unchanged by the final documentation edits).

## CI reconciliation

Historical [run41909530222](https://github.com/Taha7869/AllBarka-34/actions/runs/41909530222) failed staff dialog-focus and showcase hover-delay assertions:833 pass/2 fail/1 skip. Both checks passed in the local12-check diagnostic without application/test modifications for those failures. The later documentation parent9d6075f also completed **success** on both [push41962491448](https://github.com/Taha7869/AllBarka-34/actions/runs/41962491448) and [PR merge41962502990](https://github.com/Taha7869/AllBarka-34/actions/runs/41962502990).

This is new actual evidence, not proof of the historical trigger. No speculative staff/hover source change, relaxed assertion, skipped test or arbitrary delay is included. Recurrence needs captured focus/frame/pointer/timing evidence at the exact failing revision. New source-commit hosted outcomes must be reported separately when observed; older green runs do not certify new code.

## Review and findings

Review method: implementation-agent self-review of changed source/tests/diff and targeted runtime checks, separate from external review. Checked client/server limits, bounded allocation, upload lifecycle, cancel generation guards, track release, strict parser bounds, private/server-only configuration, text preservation, translation parity, no auto-send/order action and unchanged commerce/auth scope.

- VOICE02-R1: the supplied three test filenames did not exist. Reused `voice-concierge.test.ts` and `voice-concierge-browser.test.tsx`; no parallel suite pretending to test nonexistent code.
- VOICE02-R2: reviewer requirement to preserve long transcript conflicted with the old1,000-char provider rejection. Added4,000-char bounded review storage while keeping1,000-char submission disabled until correction; provider/client/UI checks pass.
- VOICE02-R3: a compressed raw-size overflow cannot safely be “recovered” by arbitrary byte slicing. Retained an honest error/retry path with proven track cleanup; normal45s WAV stays within upload bounds.
- VOICE02-R4: a new fake-clock exit test initially waited for animation completion using an incompatible held Motion clock. Its acceptance is cancellation **before unmount**, so the final test explicitly holds the exit frame and verifies audio cancellation while the drawer is still mounted; original close/cancel checks are retained. Locale persistence and two cancel buttons were addressed by synchronizing the intended English locale and scoping cancellation to the voice panel; no application assertions were weakened.
- Optional CodeRabbit review did not run: CLI absent; prerequisite installation request failed with `curl: (28) Proxy CONNECT aborted due to timeout`. Retry installation/authentication from an environment with access, then run the review; no CodeRabbit result or independent review is claimed. Mandatory self-review is recorded separately under repository R03, not represented as CodeRabbit output.

## WhatsApp and remaining PC tasks

Shared server transcription improvements are available for a later verified adapter. **No WhatsApp voice media path is wired or published by this change.** Inspected repository exports at the parent: conversation-engine file has5 nodes and no audio/transcription nodes; website/status/window exports and tracking patch also do not supply the current full audio intake. Connected-file searches located older exports/plans, but did not establish a current complete verified audio-parent workflow set. Do not overwrite the working bot using an assumed node map or confuse the website route's optional-user auth with a signed WhatsApp integration.

1. On PC export the current complete Meta parent and audio/media/transcription workflow(s), including their version mapping, for comparison with the saved repository contracts. Adapt the actual verified media-id download, codec conversion and dedup path. Website's45s timer cannot cap a received WhatsApp note; preserve long-note parts or explicitly ask for shorter parts, without silent truncation.
2. Select/check existing private Groq credentials, actual free-plan/model access/quota and the existing acknowledgement flag. No credential rotation or billing change was performed. Real provider calls are NOT_RUN here.
3. Verify actual Android/iPhone/desktop capture formats, microphone permission/stop/background/cancel, slow/offline/quota paths and matching device TTS. Test real Urdu/English/mixed product names, weights, negation/corrections and city/quantity recognition. Accurate editable/confirmable text is required; no100% recognition claim.
4. Keep WhatsApp confirmation/correction in Roman Urdu and use existing signed send/window/quota/dedup gates. Preserve website Firestore and WhatsApp Sheets order storage, canonical pricing and no automatic accepted order from a transcript. Publish/import only after the actual workflow is adapted and reviewed.
5. Owner reactivates hosting when ready, then perform authorized isolated end-to-end/provider/live checks before release. No production merge, deployment, data/rules/role mutation or customer message is performed in this checkpoint.

R11: website source implementation acceptance and final automated gates recorded separately from WhatsApp/provider/device/live blockers. Scope/status/changelog/handoff updated; final diff and remote save must be verified. No tracked files deleted/archived; generated test screenshots are excluded from the scoped source commit. This is a bounded source checkpoint, not a production release.
