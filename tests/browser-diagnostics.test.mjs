import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { once } from 'node:events';
import { launchTestBrowser } from './helpers/browser.mjs';
import { collectBrowserDiagnostics, useLocalFixtureFonts } from './helpers/browser-diagnostics.mjs';

test('browser diagnostics retain failed APIs, scripts and OS resource errors', async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/fonts/Amiri-Regular.ttf') { res.setHeader('Content-Type', 'font/ttf'); return res.end(readFileSync('public/fonts/Amiri-Regular.ttf')); }
    if (req.url === '/api/unavailable') { res.writeHead(503); return res.end('Unavailable'); }
    res.setHeader('Content-Type', 'text/html'); res.end('<html><body>Diagnostic fixture</body></html>');
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await launchTestBrowser();
    const page = await browser.newPage();
    const errors = collectBrowserDiagnostics(page, origin);
    await useLocalFixtureFonts(page.context(), origin);
    await page.goto(origin);
    await page.evaluate(async () => {
      const style = document.createElement('link'); style.rel = 'stylesheet';
      style.href = 'https://fonts.googleapis.com/css2?family=Amiri';
      const loaded = new Promise(resolve => { style.onload = resolve; }); document.head.append(style); await loaded;
      await document.fonts.load('16px Amiri');
    });
    assert.equal(await page.evaluate(() => document.fonts.check('16px Amiri')), true);
    assert.deepEqual(errors, []);
    await page.route('**/api/required', route => route.abort('failed'));
    await page.evaluate(() => fetch('/api/required').catch(() => {}));
    assert.ok(errors.some(error => error.includes('/api/required')));
    await page.evaluate(() => fetch('/api/unavailable'));
    assert.ok(errors.some(error => error.includes('HTTP 503:') && error.includes('/api/unavailable')));
    await page.route('**/assets/required.js', route => route.abort('failed'));
    await page.evaluate(() => new Promise(resolve => {
      const script = document.createElement('script'); script.src = '/assets/required.js';
      script.onerror = () => resolve(); document.body.append(script);
    }));
    assert.ok(errors.some(error => error.includes('/assets/required.js')));
    await page.evaluate(() => console.error('Failed to load resource: net::ERR_NO_BUFFER_SPACE'));
    await page.waitForFunction(() => true);
    assert.ok(errors.some(error => error.includes('ERR_NO_BUFFER_SPACE')));
    await page.close();
  } finally {
    await browser?.close(); server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
