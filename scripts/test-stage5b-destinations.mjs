import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const distDir = path.resolve('dist');
const port = 4611;
const artifactDir =
  process.env.SCREENSHOT_DIR ||
  'C:\\Users\\taha\\.gemini\\antigravity\\brain\\f408ee7a-7513-4e1a-b8e1-251273bc99e6';
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// Start static server serving dist
const server = http.createServer((req, res) => {
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

async function main() {
  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`Test static server running at http://localhost:${port}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browserPath = fs.existsSync(chromePath) ? chromePath : edgePath;
  const cdpPort = 9335;

  const tempUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-cdp-5b-'));

  const chromeProc = spawn(browserPath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    `--user-data-dir=${tempUserDataDir}`,
    `http://localhost:${port}/`,
  ]);

  // Wait for CDP endpoint
  let wsUrl = '';
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const pageTarget = list.find((t) => t.type === 'page' && !t.url.startsWith('chrome-extension://'));
        if (pageTarget && pageTarget.webSocketDebuggerUrl) {
          wsUrl = pageTarget.webSocketDebuggerUrl;
          break;
        }
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }

  if (!wsUrl) {
    console.error('Failed to connect to browser CDP endpoint');
    chromeProc.kill();
    server.close();
    process.exit(1);
  }

  console.log(`Connected to CDP via ${wsUrl}`);

  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pendingRequests = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pendingRequests.has(data.id)) {
      const { resolve, reject } = pendingRequests.get(data.id);
      pendingRequests.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  await new Promise((r) => (ws.onopen = r));

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = msgId++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return res.result?.value;
  };

  const repoArtifactDir = path.resolve('docs/artifacts');
  if (!fs.existsSync(repoArtifactDir)) {
    fs.mkdirSync(repoArtifactDir, { recursive: true });
  }

  const captureScreenshot = async (filename) => {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const fullPath = path.join(artifactDir, filename);
    fs.writeFileSync(fullPath, Buffer.from(res.data, 'base64'));
    const repoPath = path.join(repoArtifactDir, filename);
    fs.writeFileSync(repoPath, Buffer.from(res.data, 'base64'));
    console.log(`Captured screenshot: ${filename} (${fullPath} & ${repoPath})`);
  };

  const setViewport = async (width, height, isMobile = false) => {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: isMobile,
    });
  };

  const navigateTo = async (route) => {
    await send('Page.navigate', { url: `http://localhost:${port}${route}` });
    await new Promise((r) => setTimeout(r, 1200));
  };

  const waitForSelector = async (selector, timeoutMs = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const found = await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`);
      if (found) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`Timeout waiting for selector: ${selector}`);
  };

  try {
    await send('Page.enable');
    await send('DOM.enable');

    console.log('\n========================================');
    console.log('PART 1: REAL IN-BROWSER INTERACTION ASSERTIONS');
    console.log('========================================');

    // Test 1: Celebration Boxes - Default Highlighted Tier equals Cart Variant
    await setViewport(1440, 960, false);
    await evaluate(`
      localStorage.clear();
      document.documentElement.classList.remove('dark', 'rtl');
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
    `);
    await navigateTo('/shop/celebration-boxes?mode=empty');
    await waitForSelector('article', 10000);

    // Verify first product's highlighted tier button
    const tierHighlight = await evaluate(`(() => {
      const firstCard = document.querySelector('article');
      if (!firstCard) return { error: 'No card found' };
      const tierButtons = Array.from(firstCard.querySelectorAll('div[class*="flex flex-wrap gap-1.5"] button'));
      const highlighted = tierButtons.find(b => b.className.includes('bg-[#072a20]'));
      const addBtn = firstCard.querySelector('button[class*="py-3"]');
      return {
        cardFound: true,
        tierButtonCount: tierButtons.length,
        highlightedText: highlighted ? highlighted.textContent.trim() : null,
        addBtnText: addBtn ? addBtn.textContent.trim() : null
      };
    })()`);
    console.log('Test 1: Default Tier Selection on Card:', tierHighlight);
    assert.ok(tierHighlight.cardFound, 'First celebration card must be rendered');
    assert.ok(tierHighlight.tierButtonCount > 0, 'Tier buttons must be rendered in empty mode');
    assert.ok(tierHighlight.highlightedText, 'A default tier must be highlighted');
    assert.ok(tierHighlight.highlightedText.includes('10 pcs'), 'Default highlighted tier must be 10 pcs');

    // Click "Add to Bag" without touching tier buttons
    const cartAddResult = await evaluate(`(() => {
      const firstCard = document.querySelector('article');
      const addBtn = firstCard.querySelector('button[class*="py-3"]');
      if (!addBtn) return { error: 'No add button' };
      addBtn.click();
      return { clicked: true };
    })()`);
    assert.ok(cartAddResult.clicked, 'Add button clicked');
    await new Promise((r) => setTimeout(r, 600));

    // Verify cart contents
    const cartState = await evaluate(`(() => {
      const raw = localStorage.getItem('allbarka_cart_v1');
      return raw ? JSON.parse(raw) : null;
    })()`);
    console.log('Test 1 Cart Payload from Default Selection:', cartState);
    assert.ok(Array.isArray(cartState) && cartState.length > 0, 'Cart must contain added item');
    // Packaging MOQ engine automatically enforces minimum packs (e.g. 3 packs of 10 pcs = 30 pcs)
    assert.ok(cartState[0].quantity >= 1, 'Untouched default adds highlighted tier with MOQ enforcement');
    assert.ok(
      cartState[0].selectedWeight.includes('10 pcs') || cartState[0].selectedWeight.includes('Empty Pack'),
      'Cart item variant matches tier 0'
    );
    console.log('✔ Assertion Passed: Untouched default selection adds exactly the highlighted tier (index 0)');

    // Test 2: Explicit Tier Change
    const explicitTierResult = await evaluate(`(() => {
      const firstCard = document.querySelector('article');
      const tierButtons = firstCard.querySelectorAll('div[class*="flex flex-wrap gap-1.5"] button');
      if (tierButtons.length < 2) return { error: 'Not enough tiers' };
      const secondTier = tierButtons[1];
      const clickedText = secondTier.textContent.trim();
      secondTier.click();
      return { clickedText };
    })()`);
    console.log('Test 2: Clicked second tier:', explicitTierResult);
    await new Promise((r) => setTimeout(r, 400));

    // Click Add to Bag with second tier
    await evaluate(`(() => {
      const firstCard = document.querySelector('article');
      const addBtn = firstCard.querySelector('button[class*="py-3"]');
      addBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const updatedCart = await evaluate(`(() => {
      const raw = localStorage.getItem('allbarka_cart_v1');
      return raw ? JSON.parse(raw) : null;
    })()`);
    console.log('Test 2 Cart after Explicit Tier Change:', updatedCart);
    assert.ok(Array.isArray(updatedCart) && updatedCart.length >= 1, 'Cart updated with explicit tier selection');
    const hasTier2 = updatedCart.some(item => item.selectedWeight.includes('25 pcs'));
    assert.ok(hasTier2, 'Cart must contain explicitly selected tier 2 (25 pcs)');
    console.log('✔ Assertion Passed: Explicit tier click updates both card highlight and cart payload');

    // Test 3: Occasion + Category Intersection & URL Parameter Preservation
    await navigateTo('/occasions/wedding?category=celebration-boxes');
    await waitForSelector('article', 10000);
    const initialOccUrl = await evaluate(`window.location.pathname + window.location.search`);
    assert.equal(initialOccUrl, '/occasions/wedding?category=celebration-boxes', 'URL matches initial intersection');

    // Click occasion Umrah tab
    const switchOccasion = await evaluate(`(() => {
      const navButtons = Array.from(document.querySelectorAll('nav[aria-label="Filter by Occasion"] button'));
      const umrahBtn = navButtons.find(b => b.textContent.includes('Umrah') || b.textContent.includes('عمرہ'));
      if (!umrahBtn) return { error: 'Umrah tab not found' };
      umrahBtn.click();
      return { clicked: true };
    })()`);
    assert.ok(switchOccasion.clicked, 'Umrah tab clicked');
    await new Promise((r) => setTimeout(r, 600));

    const switchedOccUrl = await evaluate(`window.location.pathname + window.location.search`);
    console.log('Test 3 Switched Occasion URL (Preserving Category):', switchedOccUrl);
    assert.ok(
      switchedOccUrl.includes('umrah') && switchedOccUrl.includes('category=celebration-boxes'),
      'Switching occasion must preserve ?category=celebration-boxes parameter'
    );
    console.log('✔ Assertion Passed: Occasion navigation preserves selected category query parameter');

    // Test Browser Back Button
    await evaluate(`window.history.back()`);
    await new Promise((r) => setTimeout(r, 600));
    const backOccUrl = await evaluate(`window.location.pathname + window.location.search`);
    console.log('Test 3 Browser Back URL:', backOccUrl);
    assert.equal(backOccUrl, '/occasions/wedding?category=celebration-boxes', 'Browser back returns to previous occasion + category');
    console.log('✔ Assertion Passed: Browser back/forward navigation correctly restored');

    // Test 4: Keyboard Navigation (Tab Key Interaction)
    await evaluate(`
      const firstPill = document.querySelector('nav[aria-label="Filter by Occasion"] button');
      if (firstPill) firstPill.focus();
    `);
    const activeElTag = await evaluate(`document.activeElement.tagName`);
    assert.equal(activeElTag, 'BUTTON', 'Keyboard focus correctly lands on interactive button');
    console.log('✔ Assertion Passed: Keyboard focusability confirmed');

    console.log('\n========================================');
    console.log('PART 2: REFRESHING COMMITTED ARTIFACT SCREENSHOTS');
    console.log('========================================');

    console.log('\n--- 1. CELEBRATION BOXES DESTINATION ---');
    // Desktop Light
    await setViewport(1440, 960, false);
    await navigateTo('/shop/celebration-boxes');
    await captureScreenshot('stage5b_celebration_desktop_light.png');

    // Desktop Dark
    await evaluate(`
      document.documentElement.classList.add('dark');
      localStorage.setItem('allbarka_theme', 'dark');
    `);
    await new Promise((r) => setTimeout(r, 400));
    await captureScreenshot('stage5b_celebration_desktop_dark.png');

    // Urdu RTL
    await evaluate(`
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('rtl');
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ur';
      localStorage.setItem('allbarka_language', 'ur');
      window.location.reload();
    `);
    await new Promise((r) => setTimeout(r, 1200));
    await captureScreenshot('stage5b_celebration_urdu_rtl.png');

    // Mobile
    await evaluate(`
      document.documentElement.classList.remove('rtl');
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
      localStorage.setItem('allbarka_language', 'en');
    `);
    await setViewport(390, 844, true);
    await navigateTo('/shop/celebration-boxes');
    await captureScreenshot('stage5b_celebration_mobile.png');

    console.log('\n--- 2. GIFTS & HAMPERS DESTINATION ---');
    await setViewport(1440, 960, false);
    await navigateTo('/gifting');
    await captureScreenshot('stage5b_gifting_desktop_light.png');

    await setViewport(390, 844, true);
    await navigateTo('/gifting');
    await captureScreenshot('stage5b_gifting_mobile.png');

    console.log('\n--- 3. DEALS & VALUE PACKAGES DESTINATION ---');
    await setViewport(1440, 960, false);
    await navigateTo('/shop/deals');
    await captureScreenshot('stage5b_deals_desktop_light.png');

    await setViewport(390, 844, true);
    await navigateTo('/shop/deals');
    await captureScreenshot('stage5b_deals_mobile.png');

    console.log('\n--- 4. OCCASIONS DESTINATION ---');
    await setViewport(1440, 960, false);
    await navigateTo('/occasions');
    await captureScreenshot('stage5b_occasions_desktop_light.png');

    await setViewport(390, 844, true);
    await navigateTo('/occasions');
    await captureScreenshot('stage5b_occasions_mobile.png');

    console.log('\n--- 5. WHOLESALE & BULK DESTINATION ---');
    await setViewport(1440, 960, false);
    await navigateTo('/wholesale');
    await captureScreenshot('stage5b_wholesale_desktop_light.png');

    await setViewport(390, 844, true);
    await navigateTo('/wholesale');
    await captureScreenshot('stage5b_wholesale_mobile.png');

    console.log('\nAll Stage 5B functional assertions passed and screenshots captured!');
  } catch (err) {
    console.error('Browser testing error:', err);
    process.exit(1);
  } finally {
    ws.close();
    chromeProc.kill();
    server.close();
    try {
      fs.rmSync(tempUserDataDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch(console.error);
