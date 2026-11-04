# CI-VOICE-SYNC1 — committed hero transcript, 5 November 2026

Scope SELECTED / IN_PROGRESS: resolve the actual hosted follow-up failure while preserving the voice acceptance criteria. Remote parent02fa4a24d4098ed7a8deb2482f3c6f8ae80ec77a, PR16 working branch. No application, price, key, provider, data or deployment change.

Hosted run41905051979 failed:836 total,834PASS/1FAIL/1 emulator SKIP. Both browser-diagnostic cases and the gallery interaction case PASS. Sole failure is tests/voice-concierge-browser.test.tsx:99: hero input expected `pista 250g`, observed empty immediately after clicking Use this text. Local complete run on the same candidate tree had835PASS/0FAIL/1SKIP; these separate observations are retained. Failed hosted gate did not execute its backend/assets/production follow-on commands.

Source trace: VoiceInputButton invokes AllBarkaHero.onTranscript, which sets the parent query. PlaceholdersAndVanishInput copies its controlledValue into a separate internal value in a passive useEffect, creating a second state commit. Click completion alone does not assert that this commit has occurred. The previous assertion reads inputValue once with no synchronization; shop's equivalent acceptance already waits for the committed search value and URL.

Minimal change: await the actual hero input value `pista 250g`, then retain the original strict equality, correct product suggestion and no-auto-submit assertions. No arbitrary sleep, looser expected value, skipped test, provider stub change or application refactor. The browser fixture still exercises actual Buddy/hero/shop components and the real HTTP voice router with explicitly mocked hardware/provider.

Affected verification: voice unit/HTTP/browser9/9PASS, exit0 (5.88s). Required current-candidate static/build/full gates and new hosted follow-up are pending at this source-save checkpoint. Real Groq/free-plan/physical-device recognition and TTS, current merchant facts and live checks remain NOT VERIFIED/BLOCKED as previously recorded.

Review: implementation self-review of event/state path and three-line test diff; no independent reviewer claimed. Source checkpoint and final full-gate results will be referenced in the main gallery evidence, master plan and handoff after completion. Final save uses verified source parent/tree, expected-parent fast-forward and read-back. No tracked file deletion; historical evidence remains intact.
