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
