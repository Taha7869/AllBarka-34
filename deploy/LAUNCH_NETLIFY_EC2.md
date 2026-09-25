# Same-day deployment: Netlify frontend + existing EC2 API

This branch includes Netlify SPA routing and an /api proxy. The frontend build command is `npm run build:web`. The Express server must run separately on the existing EC2 instance; Netlify's static publish directory cannot execute `server.ts`.

## EC2

1. Deploy the same Git commit to an isolated folder. Use Node 22 or 24 and `npm ci && npm run build`.
2. Add server-only environment values from `.env.example` using a protected systemd environment file. Set `NODE_ENV=production`, `PORT=3001`, Firebase Admin fields, and optional n8n webhook fields. Never place the Admin private key in Netlify's VITE_ variables or Git.
3. Start `node dist/server.cjs` under systemd (Restart=on-failure). Ensure the service binds only to loopback or firewall port 3001; the current server binds 0.0.0.0, so deny public ingress to 3001 at firewall/security group.
4. In the **existing** Nginx server block for `allbarkabot.duckdns.org`, add this API location before the n8n catch-all, preserving all n8n routes and TLS setup:

```nginx
location ^~ /api/ {
    client_max_body_size 1m;
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 5s;
    proxy_read_timeout 30s;
}
```

Then `sudo nginx -t && sudo systemctl reload nginx`. A GET to `https://allbarkabot.duckdns.org/api/commerce/readiness` must show `durablePersistenceReady: true`. If false, stop: checkout cannot accept orders.

## Netlify

Connect GitHub repository and select this branch after the build passes. `netlify.toml` defines the build and API proxy; Netlify gives a temporary `*.netlify.app` URL. Configure only `VITE_FIREBASE_*` web config in Netlify build environment. Other credentials remain on EC2.

Check the site home page, direct reload of /shop and /product/:id, mobile hamper builder, hamper and normal product quotes, real checkout to a controlled test phone, saved Firestore order, confirmation and n8n delivery. Confirm /api/commerce/readiness through the Netlify URL returns the same true status. Never use a real customer's order for the smoke test.

If EC2 API cannot be brought up today, publishing the static catalog is possible, but checkout should remain disabled until the backend is reachable. A 503 maintenance response is intentional; a site with broken checkout is not a complete commerce launch.
