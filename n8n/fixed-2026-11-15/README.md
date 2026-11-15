# n8n fixes, 15 November 2026

Step-by-step session plan (when, order, tests, rollback): [docs/N8N_RUNBOOK.md](../../docs/N8N_RUNBOOK.md).

## 1. Website chat fails on the second message ("You have sent several messages quickly")

**Cause (confirmed from Railway logs and code).** The website asks n8n, n8n asks Groq `openai/gpt-oss-120b`. Groq's free plan allows about 8,000 tokens a minute per model. Each chat sent the full catalogue (about 5,200 tokens) plus 1,200 reserved reply tokens, so one message used almost the whole minute and the next got HTTP 429. Railway logs: `POST /api/concierge/chat → 200` then `→ 429` four seconds later, with `providerMs: null`. With all 254 products published, even the first message would have failed.

**Fixed in the website code** (deploys with this commit): the AI prompt now lists only the 24 products relevant to the customer's message plus a category index. Prompt size dropped from about 18,800 to about 10,000 characters and no longer grows with the catalogue. The error text no longer blames the customer.

**Fix in n8n (owner imports):**
1. n8n → open the standalone website chat workflow (webhook path `allbarka-web-chat`) → ⋯ → Download (backup).
2. Import `website-chat.json` from this folder over it (or as new, then disable the old one so only one owns the path).
3. Open **Website AI Brain Fallback**, select the same Groq credential as Website AI Brain. Save, then Publish/Activate.
   What changed: reply budget 1,200 → 700 tokens; when Groq says 429 the workflow asks `openai/gpt-oss-20b`, which has its own separate per-minute budget.
4. Optional, same for WhatsApp: `whatsapp-conversation-engine.json` adds the same fallback to **AI Brain** and turns off its instant retry (an immediate retry of a 429 only spends the same minute again). Select the Groq credential on **AI Brain Fallback**.

For real traffic later: Groq's paid Developer tier raises these limits many times. That is a billing decision for the owner.

## 2. `POST /api/integrations/n8n/order-update → 401` every minute, and a second fault behind it

The "sheet → website" workflow (Every 1 Minute → Send To Backend) has two faults:

1. **Wrong header** (the 401): the website expects header `X-AllBarka-Integration-Secret` with exactly the Railway value `N8N_INTEGRATION_SECRET`. Fix it in n8n Credentials → **Header Auth account 2**. Do not paste the secret in any chat.
2. **Wrong route and body**: it posts to `/order-update` with `requestId`, `requestCreatedAt`, `reason`, `source` and no `updatedAt`. The website rejects that body (`INVALID_INTEGRATION_PAYLOAD`) even with the right secret. Sheet status changes belong to `/order-status`. `sheet-to-website-status.json` in this folder sends the accepted body: `source`, `eventId` (`sheet:` + order and request id), `orderId`, `status` and `expectedStatus` in upper case, `expectedUpdatedAt`, `reason`. `tests/n8n-sheet-status-payload.test.ts` checks it against the website's own validator.

## 3. Checked and fine
- Order mirror workflow (`allbarka-orders`): header auth, creation and revision guards, stub rows. No change needed.
- WhatsApp inbound bot (`allbarka-bot`): duplicate-message guard before the conversation engine. Note it has no signature check on Meta's webhook; adding `X-Hub-Signature-256` verification is a later hardening step.
