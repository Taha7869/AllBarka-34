# Cloudflare in front of allbarka.com (owner steps, about 20 minutes)

Free plan is enough. Nothing in the code has to change; the site stays on Railway.

1. Create a free account at cloudflare.com → Add a site → `allbarka.com` → Free plan.
2. Cloudflare copies the current DNS records. Check the `allbarka.com` record points to the Railway target shown in Railway → service → Settings → Domains. Set it to **Proxied** (orange cloud).
3. At the domain registrar, replace the nameservers with the two Cloudflare gives. Wait until Cloudflare shows "Active".
4. SSL/TLS → mode **Full (strict)**. Edge Certificates → Always Use HTTPS on, minimum TLS 1.2.
5. Security → Bots → **Bot Fight Mode** on. Security → Settings → security level Medium.
6. Scrape Shield → **Hotlink Protection** on (other sites cannot embed your product photos).
7. Security → WAF → Rate limiting rule: path starts with `/api/`, 100 requests per 10 seconds per IP → Block 1 minute.
8. Caching: leave defaults. Do **not** cache `/api/*` (Cloudflare does not by default).
9. Railway variable after Cloudflare is active: `TRUST_PROXY_HOPS=2` (Cloudflare + Railway edge), so the site sees each customer's real IP for its own limits. Before Cloudflare it should be `1`.
10. Firebase Authentication → Authorized domains: no change (same domain).

Check afterwards: open the site, place a test order, send two chat messages, log in with Google.


## Keep it invisible to customers

Customers should never see a "checking your browser" page or a puzzle. Use only these settings:

| Setting | Value | Why |
| --- | --- | --- |
| Bot Fight Mode | On | Works in the background against known bad bots |
| Security level | Medium (not High) | High challenges too many mobile networks in Pakistan |
| "I'm Under Attack" mode | Off, only during a real attack | It shows a 5-second page to every visitor |
| Browser Integrity Check | On | Invisible header check |
| Challenge Passage | 30 minutes or more | A visitor who passed once is not asked again |
| WAF rate limit on `/api/` | Block only above 100 requests in 10 seconds | A real shopper never gets close |
| Turnstile (later, optional) | "Invisible" widget on chat and checkout only | Proves a real person without a puzzle |

## Cloudflare and the AI chat limit

The chat stopping after 2 messages is **not** caused by our own limits. Railway logs show the AI provider (Groq, free tier, about 8,000 tokens a minute per model) answering "busy" through n8n. Cloudflare cannot raise Groq's limit. What fixes it: the n8n fallback model (`n8n/fixed-2026-11-15/`) and, for real traffic, Groq's paid tier.

Chat limits since 16 Nov: every visitor gets 5 AI messages a minute, and the window resets after 60 seconds (`server.ts`). Guests also have a daily abuse ceiling, `AI_GUEST_DAILY_LIMIT` (default 60, allowed 1 to 200); leave it unset unless bots drain the quota. Google sign-in users have no daily limit. A message the AI failed to answer is no longer counted against the guest.
