# AllBarka AI Buddy — current architecture

Updated 4 November 2026 from implementation baseline 47f9acde89d58a7a25a122ed80252d51d0f0f4f2. Resume through [instructions.md](instructions.md), [RULES.md](RULES.md) and [INTEGRATIONS.md](INTEGRATIONS.md).

## Existing request path

1. src/services/aiConcierge.ts posts to apiUrl('/api/concierge/chat').
2. server.ts mounts src/lib/aiChatRouter.ts; that router accepts /api/chat and /api/concierge/chat.
3. The server reads the validated catalog and delegates through src/services/n8nAIConsultant.ts. Read that service for supported environment names and exact request/authentication contracts; do not invent configuration from this overview.
4. Public replies/recommendations are validated; existing request deadlines, guest limits, private-safe diagnostics and cancellation remain intact.

The current browser client does not call a shopper's localhost:11434. Do not enable wildcard Ollama origins or put a provider secret in a VITE_* browser variable. Actual n8n/model configuration and real provider execution are separate from the presence of this code.

## VOICE-01 — selected, implementation pending

Owner prefers a suitable free API. Initial candidate is Groq (not Grok/xAI) Whisper for bounded, user-triggered multilingual transcription into an editable transcript. Reuse existing grounded AI Buddy/search; optional tested device/browser speech output. Confirm actual account free-tier/model access, accuracy for Urdu/English product names and amounts, cancellation, rate limits and typing fallback. No automatic paid fallback or billing change; no always-listening microphone or default retained raw audio.

No voice endpoint, credential, audio upload or model execution is implemented by this documentation checkpoint. See [current reconciliation](docs/REVIEW_RECONCILIATION_2026-11-04.md).

## Verification and history

Code presence, local/CI results, actual preview/provider execution and live behavior are separate. Railway payment is pending, so live checks await owner reactivation. Tests must use isolated authorized data; no message/order/provider call is implied by a guide.

The obsolete direct-browser Ollama guide is retained as [historical evidence](docs/archive/2026-11-04/README-AI.md); its instructions are not current setup.
