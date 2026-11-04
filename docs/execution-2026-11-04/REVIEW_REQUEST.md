# Independent review request for Gemini

Review Taha7869/AllBarka-34 on codex/admin-catalog-foundation-20261023, PR16 against launch. Read instructions.md, RULES.md, MASTER_PLAN.md and docs/execution-2026-11-04/FINAL_STATUS.md first. Fetch current HEAD separately from main and the deployed build.

Inspect these exact scoped diffs:
- 9d9fd13645a24994964749e0e695e223cd81edc5 → 74c215b09abffe612e37caa1b48c62c544baf65b: revision/RTL browser synchronization.
- 74c215b09abffe612e37caa1b48c62c544baf65b → 7a9bb0c538458b89855b9baf7ba80268a07b375c: default merchandise, available pumpkin250g and truthful bundle net contents.
- 7a9bb0c538458b89855b9baf7ba80268a07b375c → 4065e357633586f186143191282c5809584e6f9a: bounded Groq voice, editable Buddy/hero/shop transcript, optional device speech, weight search and filter-target compatibility.

Do not assume earlier audit claims are correct. Check strict stale-revision409 behavior after actual post-save reload, surface locale assertions, merchant override/category compatibility, no guessed prices/ingredients/savings, voice WAV byte/duration bounds before provider calls, server-only free-plan gate, concurrency cleanup, cancellation/late permission, private errors and typing fallback. A flag cannot prove provider billing; fixture transcripts cannot prove actual Urdu recognition.

Current priority: hosted run41851671404 on4065e35 passed834 tests,0 failures,1 emulator skip, while the local full suite reports833 PASS,1 FAIL,1 emulator SKIP. Reconcile these separate observations without erasing the failure. tests/interaction-polish-browser.test.tsx:206 received one unexpected HTTP404 console event. Capture the exact resource URL/status and console.location before proposing a fix. The fixture deliberately injects missing-image404 and quote503, but timing-related leakage is only a hypothesis. Do not ignore arbitrary resource failures, weaken assertions or add arbitrary sleeps.

Run typecheck, hooks lint, build/privacy, targeted/browser and full offline checks with isolated data. Preserve server-authoritative pricing/shipping, idempotency, durable receipts, staff orders-only permissions, EN/UR/AR, dark mode and reduced motion. Keep source/local/hosted/fixture/real-provider/live evidence separate. Railway activation, actual free-plan credentials, merchant data/recipes, print samples and deferred 3D are separate owner gates.

Return findings by severity with exact path/line, reproducible evidence, minimal fix and remaining verification limits. If no issue is found, state checks performed without promising zero defects. Prepare reviewable patches for confirmed defects; no automatic merge/deploy, production data/rules/workflow/key change or price guess.
