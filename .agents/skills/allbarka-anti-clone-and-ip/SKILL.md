---
name: allbarka-anti-clone-and-ip
description: >-
  Reduce copying, scraping and reverse engineering of the AllBarka storefront and
  protect its photos, copy and business logic. Use when the owner asks to stop
  cloning, scraping, image theft or price scraping, or when touching build output,
  image pipeline, robots.txt, public APIs or the catalogue JSON endpoints.
---

# Anti-clone and IP protection

## Be honest first
Any page a browser can show can be copied: HTML, CSS and the JavaScript bundle are sent to every visitor. **No code makes a website impossible to clone.** The goal is to make copying useless and costly, and to keep everything valuable on the server. Never promise the owner "uncopyable".

## What actually protects AllBarka
1. **Keep the value on the server** (already the design — preserve it):
   - Pricing, coupons, stock, order validation, AI prompts and provider keys live in `server.ts` / `src/lib`. A cloned frontend cannot take orders or price anything.
   - Private product fields (supplier, cost, notes) never leave the server.
2. **No source maps in production.** `vite build` must not emit `dist/**/*.map` (`build.sourcemap` stays unset/false). The server bundle map in `build/` is never served. Verify: `ls dist/assets | grep -c '\.map$'` → `0`.
3. **Minified bundle** (Vite default). Do not add obfuscators: they break CSP/debugging and stop nobody determined.
4. **Rate-limit public catalogue and search endpoints** (`/api/catalog`, search, sitemap) with `express-rate-limit`, so bulk scraping is slow. Return only public fields.
5. **Images:** serve web-size WebP (≤1600px), keep originals off the site; add a subtle AllBarka mark on lifestyle photos; never commit raw camera files.
6. **Copy and brand:** keep the copyright line in the footer and Terms (content and photos © AllBarka). Register the brand name and logo; this is what lets the owner file takedowns (hosting DMCA, Meta/Instagram IP report).
7. **Optional edge protection:** put Cloudflare (free plan) in front of `allbarka.com` for bot fight mode and hotlink protection. This is an owner decision (DNS change); propose it, do not do it.
8. **Detect copies:** a hidden, harmless canary string in product copy makes copied text searchable later.

## Do not
- Do not disable right-click, text selection or keyboard shortcuts: it hurts customers and accessibility and stops no one.
- Do not block search engines in `robots.txt`.
- Do not move logic into the browser to "hide" it.
