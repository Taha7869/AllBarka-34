# AllBarka website AI — current n8n/Groq route

The owner-supplied workflow reviewed on 3 October 2026 uses Groq's `openai/gpt-oss-120b` through its existing n8n HTTP Header Auth credential. The current integration is [n8n/allbarka-website-integration.json](../n8n/allbarka-website-integration.json). The older generic Ollama bridge is superseded; no local model, paid host or browser-side Groq key is required.

## Setup

1. Back up the owner's existing n8n workflow. Import the inactive website-only JSON into a review workflow, then copy its 17 nodes into the existing workflow. The owner's original 90 nodes are not included or replaced. Keep the full 108-node review copy private; its targeted WhatsApp fixes are separate from this website import.
2. On **Website AI Webhook**, select a Header Auth credential whose header is `X-AllBarka-Webhook-Secret` and value matches the commerce server's random 32+ character `N8N_AI_WEBHOOK_SECRET`.
3. On **Website AI Brain**, select the owner's existing Groq HTTP Header Auth credential (`Authorization: Bearer …`). The node already targets `https://api.groq.com/openai/v1/chat/completions`; the prepared request uses `openai/gpt-oss-120b`, strict JSON schema and a 20-second deadline.
4. Publish/activate only after reviewing credentials and testing the isolated branch. Set `N8N_AI_WEBHOOK_URL` on the commerce host to the **Production URL** ending `/webhook/allbarka-website-ai`. A `/webhook-test/` listener is temporary.
5. Keep the webhook URL/secret, `AI_GUEST_HASH_SECRET` and Groq credential server-side. Never prefix them with `VITE_`. Use a different secret for website order events.

Credential references and Sheet resource selections are intentionally blank in the checked-in JSON. Selecting them in n8n is required. Importing JSON or passing fixture tests does not configure a running instance.

## Request and response

The browser keeps the existing `/api/chat` or `/api/concierge/chat` contract on the Express commerce API. Express generates canonical catalogue, shipping policy and requested language instructions, then sends:

```json
{"source":"website","message":"Pista 500g ka rate?","history":[{"role":"user","text":"Mujhe nuts chahiye"}],"system":"Server-generated canonical instructions"}
```

Messages are nonempty and bounded to 1,000 characters. History contains only the last four user/assistant messages, with 1,000 characters each. Browser identity, prices, order data and supplied system prompts do not become canonical instructions. This catalogue branch receives no customer order records. Tracking belongs in authenticated account history or official support.

Success returns `text`, `reply`, `action` (`answer` or `human`), `available:true` and `modelUsed:"n8n-groq"`. Human support uses only `https://wa.me/923160666083`. No complaint, ticket, Slack alert or WhatsApp message is sent by this branch. Provider errors, 429, malformed/empty/truncated replies and timeout return unavailable/retry/support UI rather than an invented answer. Deadlines are 20 seconds in n8n, 22 seconds in Express and 30 seconds in the browser, including response-body reads. `N8N_AI_TIMEOUT_MS` defaults to/maxes at 22000 and is bounded to a 1000ms minimum.

The existing Firestore guest trial is preserved. Verified Google access does not remove abuse protection: requests are limited to 10/minute per process by IP and authenticated UID where present. Multiple API replicas require coordinated ingress/rate limits for an aggregate provider quota; the per-process limiter is not a distributed guarantee. Memory stays scoped to the current browser/account and is cleared at logout or account change. Guidance is general food/store information with an AI notice; it does not diagnose or promise treatment.

## Verification and limits

`npm run test:workflow` executes the sanitized import's offline graph and Code-node fixtures. The supplied private package's original validator passed 22 checks before sanitization; those checks include the full review graph and do not certify a live provider, Sheet or original WhatsApp workflow.

Verify the published private webhook, Header Auth, current Groq credential/model, malformed replies and 429/timeout behavior on the owner's actual n8n instance before accepting live traffic. Tests do not send customer messages or submit an order. Complete host/Firebase setup in [COMMERCE-INTEGRATION.md](COMMERCE-INTEGRATION.md), and use [N8N-INTEGRATION.md](N8N-INTEGRATION.md) for the independent order mirror.

Primary references: [n8n Webhook authentication and production URLs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/), [Respond to Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/), [Groq structured outputs](https://console.groq.com/docs/structured-outputs), [Groq rate limits](https://console.groq.com/docs/rate-limits).
