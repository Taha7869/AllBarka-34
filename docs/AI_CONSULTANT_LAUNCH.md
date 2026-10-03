# AllBarka AI consultant: implementation and launch gates

## Useful points from the supplied PDF

- The existing n8n intent router sends FAQ questions to an HTTP Request node. A direct node test needs input data: connect a temporary Set/Edit Fields node with `text`, execute it first, then execute the HTTP node; or run the full workflow with an FAQ example.
- n8n should call Ollama's `/api/generate` with a JSON body, `stream: false`, a bounded timeout, and Continue On Error. Route the error output to a short, honest fallback reply.
- A `trycloudflare.com` tunnel to a home PC is temporary and will stop when the PC, Ollama, or tunnel is down. Keep its URL inside n8n. Use a stable authenticated endpoint before depending on it for customers.
- Guest trial limits belong on the server. A browser-only counter is easy to reset. Firebase Google ID tokens must be verified by the commerce API before unlimited access.

## Code contract

The browser calls `POST /api/concierge/chat` on the commerce API with `message`, recent `history`, and optional Firebase Bearer token. Verified Google sign-in has no AI message cap. Other customers receive five messages per rolling 24 hours, counted in Firestore by an HMAC of network address and browser agent; raw IP is not persisted. If Firestore or the server secret is missing, guest AI fails closed. This fingerprint is a practical trial gate, not strong identity: a different network or browser can get a new trial, and shared networks may collide.

When `N8N_AI_WEBHOOK_URL` is set, the API posts `{message, history, system}` to that HTTPS webhook, with a required `X-AllBarka-Webhook-Secret` header. n8n must verify the secret and return JSON `{ "text": "..." }` (or `reply`). A failed or slow n8n request times out after 22 seconds by default and receives the existing boutique fallback. When the webhook is not configured, the existing Gemini/boutique path remains available. The browser never receives the Ollama tunnel URL or webhook secret.

The AI is a food and catalog guide. Personal medical advice, diagnosis, and treatment claims are outside its role; test the n8n system prompt for this behavior too.

## n8n work remaining

1. In **AB-02 WhatsApp Conversation Engine V2 - Optimized**, connect the FAQ route to an HTTP Request node. Use the correct, current Ollama URL in n8n only. Send a POST JSON body with `model`, `prompt`, `system`, `stream: false`, and temperature. The Ollama API response's `response` field must be mapped to the workflow's reply.
2. Set a 20-second timeout on n8n's Ollama request and Continue On Error. Route errors to an honest "assistant temporarily unavailable" message, with human support contact.
3. Expose a separate authenticated n8n webhook to the commerce API, map the API's `message` and `history` to the FAQ branch, and return `{ "text": reply }`. Do not put webhook/tunnel URLs or secrets in Vite variables or frontend code.
4. Test with upstream mock `{ "text": "badam khane ke kya fayde hain?" }`, then an actual FAQ workflow event. Test with the home PC turned off to confirm fallback.

## Production launch gates

- Azure Static Web Apps serves frontend assets only. Deploy the Express commerce API separately over HTTPS, route `/api/*` from the frontend origin to it securely, and verify CORS/origin, Firebase Admin credentials, and order persistence. n8n is the AI/order notification workflow, not the commerce API.
- Set Firebase web app config for the Azure site and add the exact production hostname to Firebase Authentication authorized domains.
- Configure `AI_GUEST_HASH_SECRET` to a random 32+ character value, `TRUST_PROXY_HOPS` for the actual ingress, and optional n8n webhook URL/secret in the API host's server-only environment.
- Check real mobile UI, Google sign-in, five guest questions and sixth blocked, Google unlimited access, Ollama healthy/offline fallback, quote, order, and order history before public launch.
- The generated product images are editorial mockups; owner should confirm labels and packaging correspond to the goods sold.

## 3 October launch patch: ready website bridge

Import `n8n/allbarka-website-ai.json` as a **new, inactive** workflow. This uses the `allbarka-brain` model found in the owner's 28 September AB-02 export, with the website API's current catalogue, city-based shipping rules and four recent messages. It shares the model; it does not execute AB-02's WhatsApp order/session/send nodes or prove the live model is running.

1. On **Website Chat Webhook**, create/select a Header Auth credential named `X-AllBarka-Webhook-Secret` with a random secret; keep the value in n8n credentials and the commerce host's `N8N_AI_WEBHOOK_SECRET` only.
2. In **Prepare Website AI**, replace `http://OLLAMA_HOST:11434/api/chat` with the actual internal URL from your existing **AI Brain** node. This placeholder intentionally fails until configured. Do not publish your tunnel or internal URL in frontend variables. The workflow requires no paid node or new model.
3. Verify n8n can reach the existing Ollama instance. **Existing AllBarka Brain** has a 20-second timeout; the commerce API waits 22 seconds by default (`N8N_AI_TIMEOUT_MS`, 1,000–25,000 allowed), while the browser has a 30-second deadline.
4. Test the workflow, then publish/activate it and copy its **Production URL** to `N8N_AI_WEBHOOK_URL` on the commerce host. Keep `N8N_ORDER_WEBHOOK_URL` directed to the separate order-event workflow, never this chat bridge.
5. Test healthy replies, contextual follow-up, Urdu/Arabic, human-support requests and an Ollama outage. An error/invalid reply returns HTTP 503; the website offers WhatsApp support and Retry instead of presenting fallback as a live AI response. No automatic later follow-up is implemented by this bridge.

The website webhook secret is now required. Supported reply formats include `{text}`, `{reply}`, `{output}`, `{replyText}`, first-item n8n arrays and Ollama `message.content` containing JSON `{reply}`. System-role history from clients is ignored. The chat displays a translated AI guidance notice. Model compliance must still be checked against the running `allbarka-brain` configuration.

**Existing WhatsApp policy discrepancy:** the inspected September export claims free delivery at Rs.3,000 everywhere and, in one version, always for VIP. Current canonical website policy grants threshold-based free standard delivery within Lahore only. Update AB-02's store context to the current policy before cross-channel launch; this new bridge receives the current policy directly from the commerce server.

This section supersedes the previous eight-second/optional-secret implementation.
