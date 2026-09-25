# Same-day AllBarka deployment on Netlify

The website and Express API deploy to the same Netlify project. EC2 continues running n8n only. Netlify's /api/* redirect routes to a serverless function wrapping the existing Express app.

1. Connect this repository in Netlify and deploy branch `codex/launch-hamper-checkout`. Netlify reads `netlify.toml` (build: `npm run build:web`, publish: `dist`).
2. In Netlify environment variables set client-side `VITE_FIREBASE_*` values and server-only `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIRESTORE_DATABASE_ID`. Do not add `VITE_` to server secrets. Copy values from your existing secure Firebase setup, not from chat. Optional `N8N_ORDER_WEBHOOK_URL` and `N8N_WEBHOOK_SECRET` are server-only. `APP_URL` should be the Netlify site URL.
3. Deploy. Check `/api/commerce/readiness` on the new Netlify URL. It must return `durablePersistenceReady: true`. A 503 order response means Firebase Admin is not configured and orders are held safely.
4. Test homepage, mobile hamper builder, regular product quote, hamper quote, one controlled COD order, Firestore order record, reload of /success, n8n order event, human support. Check the API function logs for failures. Never use a real customer's order as a test.
5. Only after these pass, switch the old Netlify site/domain to the new site or publish this new project's Netlify subdomain.

The existing EC2 has <1 GiB RAM and currently runs n8n; do not install/build the website API there. Netlify Functions have execution and usage limits; keep the existing n8n event delivery asynchronous and monitor the free-plan quota. Do not connect a domain until controlled checkout succeeds.
