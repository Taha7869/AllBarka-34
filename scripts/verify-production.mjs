import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

// Exercise the actual production bundle without connecting to customer services.
const socket = createServer();
socket.listen(0, '127.0.0.1');
await once(socket, 'listening');
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const env = { ...process.env, NODE_ENV: 'production', PORT: String(port),
  APP_URL: 'https://allbarka-launch.example', TRUST_PROXY_HOPS: '0' };
for (const key of ['FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'FIRESTORE_EMULATOR_HOST',
  'FIREBASE_AUTH_EMULATOR_HOST', 'GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_SHEETS_ID',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GEMINI_API_KEY',
  'N8N_AI_WEBHOOK_URL', 'N8N_ORDER_WEBHOOK_URL']) env[key] = '';
const child = spawn(process.execPath, ['build/server.cjs'], { env, windowsHide: true, stdio: 'pipe' });
let logs = '';
child.stdout.on('data', chunk => { logs += chunk; });
child.stderr.on('data', chunk => { logs += chunk; });
const base = `http://127.0.0.1:${port}`;
const request = (path, options) => fetch(base + path, { ...options, signal: AbortSignal.timeout(5000) });
let passed = 0;
async function check(name, run) { await run(); passed++; console.log(`PASS ${name}`); }
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Production process exited: ${logs}`);
    try { ready = (await request('/api/health')).ok; } catch {}
    if (ready) break;
    await delay(200);
  }
  assert.ok(ready, 'Production server did not start');
  await check('health and honest persistence readiness', async () => {
    assert.equal((await (await request('/api/health')).json()).status, 'ok');
    const status = await (await request('/api/commerce/readiness')).json();
    assert.equal(status.authActive, false);
    assert.equal(status.durablePersistenceReady, false);
  });
  for (const path of ['/', '/index.html', '/shop', '/checkout', '/product/pista']) {
    await check(`SPA route ${path}`, async () => {
      const response = await request(path);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /text\/html/);
      assert.equal(response.headers.get('cache-control'), 'no-cache');
      const html = await response.text();
      assert.ok(html.includes('https://allbarka-launch.example/'));
      assert.ok(html.includes('https://allbarka-launch.example/images/generated/og-image.jpg'));
      assert.ok(!html.includes('https://allbarka.com'));
    });
  }
  for (const path of ['/server.cjs', '/server.cjs.map', '/build/server.cjs', '/missing.jpg']) {
    await check(`private/missing file ${path}`, async () => assert.equal((await request(path)).status, 404));
  }
  await check('unknown API returns JSON 404', async () => {
    const response = await request('/api/not-found');
    assert.equal(response.status, 404);
    assert.equal((await response.json()).code, 'NOT_FOUND');
  });
  await check('crawler URLs use deployment domain', async () => {
    assert.match(await (await request('/robots.txt')).text(), /Sitemap: https:\/\/allbarka-launch.example\/sitemap.xml/);
    const sitemap = await request('/sitemap.xml');
    assert.match(sitemap.headers.get('content-type'), /application\/xml/);
    assert.ok((await sitemap.text()).includes('https://allbarka-launch.example/product/pista'));
  });
  await check('hashed assets use immutable caching', async () => {
    const html = await (await request('/')).text();
    const asset = html.match(/src="(\/assets\/[^\"]+\.js)"/)[1];
    const response = await request(asset);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control'), /immutable/);
  });
  await check('gifting video supports streaming ranges', async () => {
    const response = await request('/videos/allbarka-gifting-motion.mp4', { headers: { Range: 'bytes=0-99' } });
    assert.equal(response.status, 206);
    assert.match(response.headers.get('content-type'), /video\/mp4/);
    assert.equal((await response.arrayBuffer()).byteLength, 100);
  });
  const order = { items: [{ id: 'pista', selectedWeight: '500g', quantity: 1, price: 1 }], shippingMethodId: 'standard' };
  const post = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  await check('quote rejects browser price tampering', async () => {
    const response = await request('/api/orders/quote', post(order));
    assert.equal(response.status, 200);
    const quote = await response.json();
    assert.equal(quote.totals.subtotal, 2500);
    assert.equal(quote.totals.shipping, 150);
    assert.equal(quote.totals.total, 2650);
  });
  await check('unconfigured database cannot accept an order', async () => {
    const response = await request('/api/orders', post({ ...order, name: 'Launch Test', phone: '03000000000',
      address: 'Local test address only', city: 'Lahore', paymentMethod: 'cod' }));
    assert.equal(response.status, 503);
    const result = await response.json();
    assert.equal(result.success, false);
    assert.equal(result.code, 'PERSISTENCE_PENDING');
  });
  console.log(`Production checks: ${passed} passed.`);
} finally {
  child.kill();
  if (child.exitCode === null) await once(child, 'exit');
}
