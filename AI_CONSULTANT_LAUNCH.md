# AllBarka AI consultant: implementation and launch gates

## Useful points from the supplied PDF

- The existing n8n intent router sends FAQ questions to an HTTP Request node. A direct node test needs input data: connect a temporary Set/Edit Fields node with `text`, execute it first, then execute the HTTP node; or run the full workflow with an FAQ example.
- n8n should call Ollama's `/api/generate` with a JSON body, `stream: false`, a bounded timeout, and Continue On Error. Route the error output to a short, honest fallback reply.
- A `trycloudflare.com` tunnel to a home PC is temporary and will stop when the PC, Ollama, or tunnel is down. Keep its URL inside n8n. Use a stable authenticated endpoint before depending on it for customers.
- Guest trial limits belong on the server. A browser-only counter is easy to reset. Firebase Google ID tokens must be verified by the commerce API before unlimited access.

## Code contract

The browser calls `POST /api/concierge/chat` on the commerce API with `message`, recent `history`, and optional Firebase Bearer token. Verified Google sign-in has no AI message cap. Other customers receive five messages per rolling 24 hours, counted in Firestore by an HMAC of network address and browser agent; raw IP is not persisted. If Firestore or the server secret is missing, guest AI fails closed. This fingerprint is a practical trial gate, not strong identity: a different network or browser can get a new trial, and shared networks may collide.

When `N8N_AI_WEBHOOK_URL` is set, the API posts `{message, history, system}` to that HTTPS webhook, with an optional `X-AllBarka-Webhook-Secret` header. n8n must verify the secret and return JSON `{ "text": "..." }` (or `reply`). A failed or slow n8n request times out after eight seconds and receives the existing boutique fallback. When the webhook is not configured, the existing Gemini/boutique path remains available. The browser never receives the Ollama tunnel URL or webhook secret.

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
