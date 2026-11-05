# AllBarka AI Buddy — current architecture

5 November 2026 — **VOICE-02 accepted plan, implementation deferred:** [website + WhatsApp continuation](docs/execution-2026-11-04/VOICE_02_PLAN_2026-11-05.md). The45s/single-request upgrade is TODO; the14s/15s VOICE-01 behavior documented below is still actual source behavior. WhatsApp voice-note transport is a separate adaptation, not already provided by the website route. PR16 merge CI has two documented unresolved non-voice failures; older successful runs do not establish current release readiness.

Updated 4 November 2026 from implementation baseline 47f9acde89d58a7a25a122ed80252d51d0f0f4f2. Resume through [instructions.md](instructions.md), [RULES.md](RULES.md) and [INTEGRATIONS.md](INTEGRATIONS.md).

## Existing request path

1. src/services/aiConcierge.ts posts to apiUrl('/api/concierge/chat').
2. server.ts mounts src/lib/aiChatRouter.ts; that router accepts /api/chat and /api/concierge/chat.
3. The server reads the validated catalog and delegates through src/services/n8nAIConsultant.ts. Read that service for supported environment names and exact request/authentication contracts; do not invent configuration from this overview.
4. Public replies/recommendations are validated; existing request deadlines, guest limits, private-safe diagnostics and cancellation remain intact.

The current browser client does not call a shopper's localhost:11434. Do not enable wildcard Ollama origins or put a provider secret in a VITE_* browser variable. Actual n8n/model configuration and real provider execution are separate from the presence of this code.

## VOICE-01 — implementation and setup

Groq (not Grok/xAI) Whisper input reuses the existing Buddy, hero search and shop search. Explicit tap records up to14 seconds, leaving codec margin under the15-second bound. The user reviews/edits the transcript before using it; using text never sends a chat/order automatically. Search applies reviewed text through the existing filter path. Typing remains available.

`MediaRecorder` capture is decoded/resampled locally into canonical mono16kHz PCM16 WAV. `POST /api/concierge/transcribe` reuses optional authentication and the existing chat limiter. It accepts only canonical WAV, checks actual duration from bytes before upstream work, enforces2MB/15s limits, one pending request per IP and six per process,20s server timeout, cancellation, and a64KiB provider-response ceiling. Server returns only bounded text or private-safe error code. Application code does not persist/log raw audio. Groq receives audio after stopping; its own processing/retention terms still apply. Noise heuristics can reject valid quiet speech; editable typing is the fallback.

Set private server `GROQ_API_KEY` only after the owner verifies their actual free-plan/model access and quota. `GROQ_VOICE_MODEL` allows `whisper-large-v3` (default) or `whisper-large-v3-turbo`; set `VOICE_GROQ_FREE_TIER_CONFIRMED=true` only for that verified account. Otherwise the route returns503. A flag cannot prove provider billing, and the code neither changes billing nor selects a paid fallback. Never use `VITE_GROQ_*`, commit a key, or alter n8n chat credentials for this feature. No credential/environment change was made in this implementation.

Secure-context browsers with MediaRecorder and Web Audio show the mic. Unsupported browsers retain typing. Mic tracks stop on cancellation, closing/unmounting the UI, account change or backgrounding. Starting another voice control cancels the previous capture. Transcription/permission failures, quota and timeout return to typing without a confirmed order or invented product action.

AI Buddy optionally reads replies only after a tap and when a matching device language voice exists (`voiceschanged` supported). No English fallback for Arabic/Urdu script; unavailable voices hide the button. Stop/close/start-recording cancels output. Device voice availability/processing varies; actual phones and Urdu/English recognition remain separate manual/provider gates. Tests isolate hardware/provider responses and do not prove STT accuracy. See [execution evidence](docs/execution-2026-11-04/README.md).

## Verification and history

Code presence, local/CI results, actual preview/provider execution and live behavior are separate. Railway payment is pending, so live checks await owner reactivation. Tests must use isolated authorized data; no message/order/provider call is implied by a guide.

The obsolete direct-browser Ollama guide is retained as [historical evidence](docs/archive/2026-11-04/README-AI.md); its instructions are not current setup.
