import assert from 'node:assert/strict';
import test, { describe, before, after } from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { launchTestBrowser } from './helpers/browser.mjs';

const PORT = 4589;
const distDir = path.resolve('dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function createStaticServer() {
  return http.createServer((req, res) => {
    let reqPath = req.url?.split('?')[0] || '/';
    if (reqPath === '/') reqPath = '/index.html';
    let filePath = path.join(distDir, reqPath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    try {
      const data = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  });
}

// Freeze the blank page before loading: slow requests/driver work must not age autoplay.
// Application time then advances only through each test's explicit runFor calls.
async function openControlledPage(page) {
  const initialTime = new Date('2026-01-01T00:00:00Z');
  await page.clock.install({ time: initialTime });
  await page.clock.pauseAt(new Date(initialTime.getTime() + 1000));
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#boutique-selections');
}

describe('Stage 5A BoutiqueSelections Controlled-Clock Lifecycle & Timing', () => {
  let server;
  let browser;

  before(async () => {
    server = createStaticServer();
    await new Promise((resolve) => server.listen(PORT, resolve));
    browser = await launchTestBrowser();
  });

  after(async () => {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  async function getActiveTabId(page) {
    return page.evaluate(() => {
      const active = document.querySelector('#boutique-selections [role="tab"][aria-selected="true"]');
      if (!active) return null;
      return active.getAttribute('data-tab-id') || active.id.split('-').pop();
    });
  }

  async function isAutoplayPlaying(page) {
    return page.evaluate(() => {
      const btn = document.querySelector('#boutique-selections button[aria-label*="autoplay"]');
      if (!btn) return false;
      return btn.getAttribute('aria-pressed') === 'true';
    });
  }

  test('1. Initial advance: advances at configured 6000ms rotation interval', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await openControlledPage(page);

    // Arm fresh countdown with mouse outside showcase
    await page.hover('footer');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.clock.runFor(100);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    assert.equal(await getActiveTabId(page), 'dry-fruits', 'Initial tab must be dry-fruits');

    // Autoplay interval is 6000ms. At 5800ms, still on initial tab
    await page.clock.runFor(5800);
    assert.equal(await getActiveTabId(page), 'dry-fruits', 'Must remain on initial tab before 6000ms interval expires');

    // At 6100ms total (+300ms), it advances to second tab (pantry)
    await page.clock.runFor(300);
    assert.equal(await getActiveTabId(page), 'pantry', 'Must advance to pantry tab after 6000ms interval');

    // Subsequent rotation: at +5800ms, still on pantry
    await page.clock.runFor(5800);
    assert.equal(await getActiveTabId(page), 'pantry', 'Must remain on pantry before next 6000ms interval expires');

    // At +300ms, advances to third tab (gifts)
    await page.clock.runFor(300);
    assert.equal(await getActiveTabId(page), 'gifts', 'Must advance to gifts after second 6000ms interval');

    await context.close();
  });

  test('2. Sustained hover: pointer hovering over showcase pauses rotation indefinitely', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await openControlledPage(page);

    // Hover over boutique selections
    await page.hover('#boutique-selections');
    assert.equal(await getActiveTabId(page), 'dry-fruits');

    // Fast-forward 18000ms (3 full intervals) while mouse is sustained over the component
    await page.clock.runFor(18000);
    assert.equal(await getActiveTabId(page), 'dry-fruits', 'Must NEVER advance while pointer hover is sustained');

    await context.close();
  });

  test('3. Hover exit / resume delay: exact 3000ms resume delay + 6000ms interval = 9000ms first advance', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await openControlledPage(page);

    // Hover and then exit to footer
    await page.hover('#boutique-selections');
    await page.hover('footer');

    // Timeline check:
    // 0ms..3000ms: Resume delay in progress (isResumePending = true)
    // 3000ms: Resume delay finishes, starts 6000ms interval
    // 3000ms..9000ms: Countdown in progress
    // 9000ms: Tab advance!

    await page.clock.runFor(3000); // 3000ms: resume delay finishes
    assert.equal(await getActiveTabId(page), 'dry-fruits', 'Must not advance at 3000ms');

    await page.clock.runFor(5800); // 8800ms total
    assert.equal(await getActiveTabId(page), 'dry-fruits', 'Must not advance before 9000ms total');

    await page.clock.runFor(300); // 9100ms total
    assert.equal(await getActiveTabId(page), 'pantry', 'Must advance to pantry at 9000ms');

    await context.close();
  });

  test('4. Repeated enter/exit: re-entering before 3000ms cancels resume and resets delay on subsequent exit', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await openControlledPage(page);

    // Initial exit to footer
    await page.hover('#boutique-selections');
    await page.hover('footer');

    // Fast-forward 1500ms into the 3000ms resume delay
    await page.clock.runFor(1500);

    // Re-enter showcase: cancels resume delay!
    await page.hover('#boutique-selections');
    await page.clock.runFor(2000);

    // Exit again to footer: fresh 3000ms delay starts!
    await page.hover('footer');

    // Phase 1: 3000ms resume delay finishes, React re-renders to start 6000ms interval
    await page.clock.runFor(3000);
    await page.waitForTimeout(0);
    assert.equal(await getActiveTabId(page), 'dry-fruits', 'Must not advance during 3000ms resume delay');

    // Phase 2: 5800ms of the 6000ms interval (8800ms total from second exit)
    await page.clock.runFor(5800);
    assert.equal(await getActiveTabId(page), 'dry-fruits', 'Must not advance before full 9000ms total');

    // Phase 3: 300ms (9100ms total from second exit)
    await page.clock.runFor(300);
    assert.equal(await getActiveTabId(page), 'pantry', 'Must advance to pantry after fresh 9000ms total delay');

    await context.close();
  });

  test('5. Manual pause until Play: tab click or keyboard focus pauses permanently until Play clicked', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await openControlledPage(page);

    // User manually clicks third tab (Gifts)
    await page.click('#boutique-selections [role="tab"][data-tab-id="gifts"]');
    assert.equal(await getActiveTabId(page), 'gifts');

    // Mouse moves away to footer
    await page.hover('footer');

    // Fast forward 24000ms (4 intervals)
    await page.clock.runFor(24000);
    assert.equal(await getActiveTabId(page), 'gifts', 'Must stay paused permanently after manual tab selection');
    assert.equal(await isAutoplayPlaying(page), false, 'Play/pause button must reflect paused state');

    // User clicks Play button
    await page.click('#boutique-selections button[aria-label*="autoplay"]');
    assert.equal(await isAutoplayPlaying(page), true, 'Play/pause button must reflect playing state');

    // Mouse moves away from Play button to footer so hover protection ends
    await page.hover('footer');

    // Phase 1: 3000ms resume delay
    await page.clock.runFor(3000);
    await page.waitForTimeout(0);
    assert.equal(await getActiveTabId(page), 'gifts', 'Must wait during resume delay');

    // Phase 2: 5800ms of 6000ms interval (8800ms total)
    await page.clock.runFor(5800);
    assert.equal(await getActiveTabId(page), 'gifts', 'Must not advance before full interval');

    // Phase 3: 300ms (9100ms total)
    await page.clock.runFor(300);
    assert.equal(await getActiveTabId(page), 'celebration-boxes', 'Must resume rotation after Play button click and exit');

    await context.close();
  });

  test('6. Play while hovered: clicking Play while pointer is hovering protects entire hover duration', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await openControlledPage(page);

    // User pauses by clicking pause button
    await page.click('#boutique-selections button[aria-label*="autoplay"]');
    assert.equal(await isAutoplayPlaying(page), false);

    // Hover over showcase
    await page.hover('#boutique-selections');

    // User clicks Play button while pointer is hovered
    await page.click('#boutique-selections button[aria-label*="autoplay"]');
    assert.equal(await isAutoplayPlaying(page), true, 'Showcase is armed for play');

    // Pointer is STILL hovered over the showcase: hover protection MUST remain active!
    await page.clock.runFor(15000);
    assert.equal(await getActiveTabId(page), 'dry-fruits', 'Must NOT advance while hovered even after Play was clicked');

    // Pointer leaves showcase to footer
    await page.hover('footer');

    // Phase 1: 3000ms resume delay
    await page.clock.runFor(3000);
    await page.waitForTimeout(0);
    assert.equal(await getActiveTabId(page), 'dry-fruits', 'Must not advance during resume delay');

    // Phase 2: 5800ms of countdown (8800ms total)
    await page.clock.runFor(5800);
    assert.equal(await getActiveTabId(page), 'dry-fruits', 'Must honor resume delay after hover exit');

    // Phase 3: 300ms (9100ms total)
    await page.clock.runFor(300);
    assert.equal(await getActiveTabId(page), 'pantry', 'Must advance after full delay and interval');

    await context.close();
  });

  test('7. Visibility lifecycle: hidden document pauses rotation; return restarts fresh countdown without immediate jump', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await openControlledPage(page);

    // Start with dry fruits
    assert.equal(await getActiveTabId(page), 'dry-fruits');

    // Simulate document being hidden (tab switched to background)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Advance 30,000ms while hidden
    await page.clock.runFor(30000);
    assert.equal(await getActiveTabId(page), 'dry-fruits', 'Must NOT advance while document is hidden');

    // Document becomes visible again
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // It must NOT advance immediately on return!
    assert.equal(await getActiveTabId(page), 'dry-fruits', 'Must NOT advance immediately on visibility return');

    // At 5800ms after return, still dry fruits
    await page.clock.runFor(5800);
    assert.equal(await getActiveTabId(page), 'dry-fruits', 'Must count down fresh 6000ms interval after return');

    // At 6100ms after return, advances to pantry!
    await page.clock.runFor(300);
    assert.equal(await getActiveTabId(page), 'pantry', 'Advances after fresh interval completes');

    await context.close();
  });

  test('8. Reduced motion: defaults to paused state, and explicit Play opts into rotation respecting hover/visibility', async () => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await openControlledPage(page);

    assert.equal(await getActiveTabId(page), 'dry-fruits');
    assert.equal(await isAutoplayPlaying(page), false, 'Must default to paused when reduced motion is preferred');

    // Advance 20,000ms without explicit Play - must remain paused
    await page.clock.runFor(20000);
    assert.equal(await getActiveTabId(page), 'dry-fruits', 'Must not advance under reduced motion by default');

    // 1. Explicit Play opts into rotation
    await page.click('button[aria-label="Play showcase autoplay"]');
    assert.equal(await isAutoplayPlaying(page), true, 'Button state must reflect active playback after explicit Play');

    // Pointer is hovering over the Play button right after click -> rotation must remain protected!
    await page.clock.runFor(10000);
    assert.equal(await getActiveTabId(page), 'dry-fruits', 'Must NOT advance while pointer remains hovering over button');

    // 2. Pointer leaves the showcase -> 3000ms resume delay + 6000ms countdown = 9000ms first advance
    await page.hover('footer');
    await page.clock.runFor(3000);
    await page.waitForTimeout(0);

    await page.clock.runFor(5800);
    assert.equal(await getActiveTabId(page), 'dry-fruits', 'Still counting down 6000ms after resume delay');

    await page.clock.runFor(300);
    assert.equal(await getActiveTabId(page), 'pantry', 'Advances to pantry after explicit Play and delay');

    // 3. Hovering pauses rotation again even under reduced motion opt-in
    await page.hover('#boutique-selections');
    await page.clock.runFor(15000);
    assert.equal(await getActiveTabId(page), 'pantry', 'Hover must pause rotation even when opted into playback');

    // 4. Leave showcase and verify visibility protection under reduced motion opt-in
    await page.hover('footer');
    await page.clock.runFor(3000);
    await page.waitForTimeout(0);

    // Document hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.clock.runFor(25000);
    assert.equal(await getActiveTabId(page), 'pantry', 'Must NOT advance while document is hidden');

    // Document visible
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.clock.runFor(5800);
    assert.equal(await getActiveTabId(page), 'pantry', 'Fresh countdown on return');
    await page.clock.runFor(300);
    assert.equal(await getActiveTabId(page), 'gifts', 'Advances after fresh interval on return');

    // 5. Explicit Pause pauses indefinitely
    await page.click('button[aria-label="Pause showcase autoplay"]');
    assert.equal(await isAutoplayPlaying(page), false, 'Button reflects paused state after explicit Pause');
    await page.hover('footer');
    await page.clock.runFor(25000);
    assert.equal(await getActiveTabId(page), 'gifts', 'Remains paused after explicit Pause');

    await context.close();
  });

  test('9. Asynchronously loaded enabled = false: respects published admin autoplay setting', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Mock API returning autoplay.enabled = false
    await page.route('**/api/merchandising', async (route) => {
      const json = {
        settings: {
          autoplay: { enabled: false, intervalMs: 6000, resumeDelayMs: 3000 },
          showcaseTabs: [
            { id: 'dry-fruits', label_en: 'Dry Fruits & Nuts', productIds: ['pista', 'badam', 'chilgoza'], visible: true },
            { id: 'pantry', label_en: 'Pantry', productIds: ['honey', 'ghee', 'zafran'], visible: true },
          ],
        },
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
    });

    await openControlledPage(page);

    assert.equal(await isAutoplayPlaying(page), false, 'Must remain paused when admin setting has enabled=false');

    await page.clock.runFor(20000);
    assert.equal(await getActiveTabId(page), 'dry-fruits', 'Must not advance when autoplay is disabled in settings');

    await context.close();
  });

  test('10. Empty tabs handling: tabs with zero active products are hidden and rotation is disabled if <= 1 tab', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Mock API returning 1 valid tab and 1 empty tab with non-existent products
    await page.route('**/api/merchandising', async (route) => {
      const json = {
        settings: {
          autoplay: { enabled: true, intervalMs: 6000, resumeDelayMs: 3000 },
          showcaseTabs: [
            { id: 'dry-fruits', label_en: 'Dry Fruits & Nuts', productIds: ['pista'], visible: true },
            { id: 'empty-tab', label_en: 'Empty', productIds: ['non-existent-xyz-999'], visible: true },
          ],
        },
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
    });

    await page.goto(`http://localhost:${PORT}/`);
    await page.waitForSelector('#boutique-selections');

    const visibleTabs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#boutique-selections [role="tab"]')).map(t => t.getAttribute('data-tab-id') || t.id.split('-').pop());
    });

    assert.equal(visibleTabs.length, 1, 'Empty tab must be omitted from tablist');
    assert.equal(visibleTabs[0], 'dry-fruits');

    // Since only 1 tab exists, rotation is impossible
    assert.equal(await isAutoplayPlaying(page), false, 'Showcase cannot play when only 1 tab exists');

    await context.close();
  });

  test('11. Unmount cleanup: navigating away clears all timers without leaks or errors', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err));

    await openControlledPage(page);

    // Start rotation timers
    await page.clock.runFor(1500);

    // Navigate to /shop (unmounting HomePage and BoutiqueSelections)
    await page.goto(`http://localhost:${PORT}/shop`);
    await page.waitForSelector('.editorial-page, main, body');

    // Advance clock after unmount
    await page.clock.runFor(15000);

    assert.equal(errors.length, 0, 'No uncaught errors or timer leaks on unmount');

    await context.close();
  });
});
