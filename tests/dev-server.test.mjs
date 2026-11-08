import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';

test('development preview honours its port and gives the Vite preamble the request CSP nonce', { timeout: 30000 }, async () => {
  const reservation = net.createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, ['scripts/dev.mjs', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    env: { ...process.env, ALLBARKA_SKIP_LOCAL_ENV: 'true', FIREBASE_CLIENT_EMAIL: '', FIREBASE_PRIVATE_KEY: '', GOOGLE_APPLICATION_CREDENTIALS: '', N8N_ORDER_WEBHOOK_URL: '', N8N_STATUS_WEBHOOK_URL: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  try {
    const deadline = Date.now() + 20000;
    let response;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error(`Preview exited before readiness: ${output}`);
      try { response = await fetch(`http://127.0.0.1:${port}/`); if (response.ok) break; } catch { /* Server is still starting. */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(response?.ok, 'the explicit preview port serves the application');
    const html = await response.text();
    const policy = response.headers.get('content-security-policy');
    const nonce = policy?.match(/'nonce-([^']+)'/)?.[1];
    assert.ok(nonce, 'a per-request nonce remains in the CSP');
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map(match => match[0]);
    assert.ok(html.includes('@react-refresh'), 'Vite transformed the real document');
    assert.ok(scripts.length > 1 && scripts.every(script => script.includes(`nonce="${nonce}"`)), 'the refresh preamble and application scripts carry the matching nonce');
    const missing = await fetch(`http://127.0.0.1:${port}/api/not-a-real-endpoint`);
    assert.equal(missing.status, 404, 'API failures cannot become the SPA document');
    assert.match(missing.headers.get('content-type') || '', /application\/json/);
  } finally {
    if (child.exitCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
      const [code, signal] = await exited;
      clearTimeout(timer);
      assert.equal(signal, null, 'preview shutdown needs no force kill');
      assert.equal(code, 0, 'preview exits cleanly');
    }
  }
});
