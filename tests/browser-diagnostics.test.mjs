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

test('browser diagnostics identify delayed fixture failures by exact URL/status while retaining unrelated errors', async () => {
  let finishPreview;
  let reachedPreview;
  const previewRequested = new Promise(resolve => { reachedPreview = resolve; });
  let previewStatus = 404;
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.url === '/images/missing-preview.webp' && previewStatus === 404) {
      finishPreview = () => { res.writeHead(404); res.end('Intentional missing preview'); };
      reachedPreview();
      return;
    }
    if (req.url === '/images/missing-preview.webp' || req.url === '/api/orders/quote') {
      res.writeHead(503); return res.end('Unavailable fixture');
    }
    if (req.url === '/images/required.webp') { res.writeHead(404); return res.end('Unexpected missing image'); }
    res.setHeader('Content-Type', 'text/html'); res.end('<html><body>Failure fixture</body></html>');
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await launchTestBrowser();
    const page = await browser.newPage();
    const errors = collectBrowserDiagnostics(page, origin, { expectedHttpFailures: [
      { method: 'GET', path: '/images/missing-preview.webp', status: 404 },
      { method: 'POST', path: '/api/orders/quote', status: 503 },
    ] });
    await page.goto(origin);
    const consoleFor = (pathname, status) => page.waitForEvent('console', message =>
      message.type() === 'error' && message.location().url === `${origin}${pathname}` && message.text().includes(`status of ${status}`));
    const lateConsole = consoleFor('/images/missing-preview.webp', 404);
    await page.evaluate(() => {
      window.fixtureBusy = true;
      window.imageDone = new Promise(resolve => {
        const image = new Image(); image.onerror = resolve; image.src = '/images/missing-preview.webp';
      });
    });
    await previewRequested;
    // The real HTTP error arrives after the UI has left its failure exercise.
    await page.evaluate(() => { window.fixtureBusy = false; });
    finishPreview();
    await lateConsole;
    await page.evaluate(() => window.imageDone.then(() => undefined));
    assert.equal(await page.evaluate(() => window.fixtureBusy), false);
    assert.deepEqual(errors, []);

    const quoteConsole = consoleFor('/api/orders/quote', 503);
    assert.equal(await page.evaluate(async () => (await fetch('/api/orders/quote', { method: 'POST' })).status), 503);
    await quoteConsole;
    assert.deepEqual(errors, []);

    // The same expected URL with a different status must still fail.
    previewStatus = 503;
    const wrongStatus = consoleFor('/images/missing-preview.webp', 503);
    await page.evaluate(async () => { await fetch('/images/missing-preview.webp'); });
    await wrongStatus;
    assert.ok(errors.some(error => error.includes(`HTTP 503: ${origin}/images/missing-preview.webp`)));
    assert.ok(errors.some(error => error.startsWith('Console:') && error.includes('/images/missing-preview.webp')));

    // An expected status at another resource, or a different HTTP method, is not exempt.
    const otherResource = consoleFor('/images/required.webp', 404);
    await page.evaluate(async () => { await fetch('/images/required.webp'); });
    await otherResource;
    assert.ok(errors.some(error => error.includes(`HTTP 404: ${origin}/images/required.webp`)));
    const wrongMethod = consoleFor('/api/orders/quote', 503);
    await page.evaluate(async () => { await fetch('/api/orders/quote'); });
    await wrongMethod;
    assert.ok(errors.some(error => error.includes(`HTTP 503: ${origin}/api/orders/quote`)));
    const appError = page.waitForEvent('console', message => message.text() === 'Application failure during fixture recovery');
    await page.evaluate(() => console.error('Application failure during fixture recovery'));
    await appError;
    assert.ok(errors.some(error => error.includes('Application failure during fixture recovery')));
    await page.close();
  } finally {
    await browser?.close(); server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
