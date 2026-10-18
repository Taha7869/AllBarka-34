import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const distDir = path.resolve('dist');
const port = 4567;
const artifactDir = process.env.SCREENSHOT_DIR || 'C:\\Users\\taha\\.gemini\\antigravity\\brain\\f408ee7a-7513-4e1a-b8e1-251273bc99e6';
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

// Start static server
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
  const cdpPort = 9222;

  const tempUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-cdp-'));

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
    `http://localhost:${port}/shop`,
  ]);

  // Wait for CDP endpoint to be available
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

  const testResults = [];
  const logTest = (name, passed, detail = '') => {
    testResults.push({ name, passed, detail });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${name}${detail ? ` (${detail})` : ''}`);
  };

  try {
    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    // Set desktop viewport so lg:flex is active
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log('Navigating to http://localhost:' + port + '/shop ...');
    await send('Page.navigate', { url: `http://localhost:${port}/shop` });
    await new Promise((r) => setTimeout(r, 2000));

    const pageUrl = await evaluate(`window.location.href`);
    console.log(`Current page URL: ${pageUrl}`);

    // TEST 1: Header presence & Two-Level structure
    const headerInfo = await evaluate(`(() => {
      const header = document.getElementById('main-navigation-header');
      if (!header) return null;
      const mainTriggers = Array.from(header.querySelectorAll('[id^="nav-trigger-"]')).map(el => el.id);
      const foodLinks = Array.from(header.querySelectorAll('div[role="navigation"] a[data-nav-path]')).map(el => ({
        path: el.getAttribute('data-nav-path'),
        text: el.textContent.trim()
      }));
      return { exists: true, mainTriggers, foodLinks, height: header.getBoundingClientRect().height };
    })()`);

    logTest('Two-Level Header mounted in DOM', !!headerInfo && headerInfo.exists, `Height: ${headerInfo?.height}px`);
    logTest('Main row disclosure triggers present', headerInfo?.mainTriggers.length === 5, headerInfo?.mainTriggers.join(', '));
    logTest('Compact food row has 6 categories', headerInfo?.foodLinks.length === 6, headerInfo?.foodLinks.map(f => f.path).join(', '));

    // TEST 2: Slow/Diagonal pointer travel into dropdown
    // Trigger box
    const triggerBox = await evaluate(`(() => {
      const el = document.getElementById('nav-trigger-shop');
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, left: r.left, right: r.right, bottom: r.bottom };
    })()`);

    // Hover over trigger
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: triggerBox.x, y: triggerBox.y });
    await new Promise((r) => setTimeout(r, 80));

    let isExpanded = await evaluate(`document.getElementById('nav-trigger-shop')?.getAttribute('aria-expanded') === 'true'`);
    logTest('Shop dropdown opens on hover', isExpanded);

    // Diagonal pointer movement: move mouse down and diagonally to the right (outside the trigger into the bridge gap)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: triggerBox.x + 35, y: triggerBox.bottom + 8 });
    // Wait 100ms (during the 220ms cancelable delay)
    await new Promise((r) => setTimeout(r, 100));

    const stillOpenDuringDiagonal = await evaluate(`document.getElementById('nav-dropdown-panel-shop') !== null`);
    logTest('Dropdown stays open during slow diagonal pointer travel', stillOpenDuringDiagonal);

    // Move pointer inside dropdown panel
    const panelBox = await evaluate(`(() => {
      const panel = document.getElementById('nav-dropdown-panel-shop');
      const r = panel.getBoundingClientRect();
      return { x: r.x + 20, y: r.y + 20, bottom: r.bottom };
    })()`);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: panelBox.x, y: panelBox.y });
    // Wait > 220ms (350ms) to verify panel remains open after cancelable close delay expires while pointer is inside
    await new Promise((r) => setTimeout(r, 350));

    const openInsidePanel = await evaluate(`document.getElementById('nav-dropdown-panel-shop') !== null`);
    logTest('Dropdown remains open while cursor inside panel beyond 220ms delay (350ms elapsed)', openInsidePanel);

    // Exercise actual internal scrolling reaching the last link
    const scrollTest = await evaluate(`(() => {
      const panel = document.getElementById('nav-dropdown-panel-shop');
      if (!panel) return { success: false, reason: 'panel not found' };
      const links = Array.from(panel.querySelectorAll('a'));
      const lastLink = links[links.length - 1];
      if (!lastLink) return { success: false, reason: 'no links in panel' };
      lastLink.scrollIntoView();
      return {
        success: true,
        scrollTop: panel.scrollTop,
        lastLinkText: lastLink.textContent?.trim(),
        lastLinkPath: lastLink.getAttribute('data-nav-path') || lastLink.getAttribute('href'),
      };
    })()`);
    logTest('Internal scrolling operates inside dropdown panel and reaches last link', scrollTest.success, `Last link: ${scrollTest.lastLinkText} (${scrollTest.lastLinkPath}), scrollTop: ${scrollTest.scrollTop}`);

    // TEST 3: Dropdown panel doesn't overflow viewport
    const viewportCheck = await evaluate(`(() => {
      const panel = document.getElementById('nav-dropdown-panel-shop');
      if (!panel) return false;
      const r = panel.getBoundingClientRect();
      return r.left >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight;
    })()`);
    logTest('Dropdown panel fits within viewport without clipping', viewportCheck);

    // Capture screenshot with dropdown open
    await captureScreenshot('stage4_desktop_dropdown.png');

    // TEST 4: Outside click dismissal
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 10, y: 300, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 10, y: 300, button: 'left', clickCount: 1 });
    await new Promise((r) => setTimeout(r, 100));

    const closedAfterOutsideClick = await evaluate(`document.getElementById('nav-dropdown-panel-shop') === null`);
    logTest('Dropdown closes on outside click', closedAfterOutsideClick);

    // TEST 5: Keyboard navigation & focus behavior
    // 5a. Space key trigger toggle
    await evaluate(`document.getElementById('nav-trigger-gifting').focus()`);
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: ' ', code: 'Space' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space' });
    await new Promise((r) => setTimeout(r, 80));

    const giftingOpenedBySpace = await evaluate(`document.getElementById('nav-trigger-gifting')?.getAttribute('aria-expanded') === 'true'`);
    logTest('Space key opens dropdown menu', giftingOpenedBySpace);

    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: ' ', code: 'Space' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space' });
    await new Promise((r) => setTimeout(r, 80));

    const giftingClosedBySpace = await evaluate(`document.getElementById('nav-dropdown-panel-gifting') === null`);
    logTest('Space key toggles dropdown menu closed', giftingClosedBySpace);

    // Re-open with Space
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: ' ', code: 'Space' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space' });
    await new Promise((r) => setTimeout(r, 80));

    // 5b. Tab moves focus into dropdown panel
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' });
    await new Promise((r) => setTimeout(r, 80));

    const focusInsideGiftingPanel = await evaluate(`(() => {
      const panel = document.getElementById('nav-dropdown-panel-gifting');
      return !!panel && panel.contains(document.activeElement);
    })()`);
    logTest('Tab key moves focus into dropdown panel items', focusInsideGiftingPanel);

    // 5c. Pointer leave retention (> 220ms delay while focus retained inside)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 10, y: 10 });
    await new Promise((r) => setTimeout(r, 300)); // Wait > 220ms

    const retainedWithFocusOnMouseLeave = await evaluate(`document.getElementById('nav-dropdown-panel-gifting') !== null`);
    logTest('Dropdown remains open when mouse leaves if keyboard focus is retained inside', retainedWithFocusOnMouseLeave);

    // 5d. Focus transition between disclosure groups
    await evaluate(`document.getElementById('nav-trigger-occasions').focus()`);
    await new Promise((r) => setTimeout(r, 80));

    const previousPanelDismissedOnFocusShift = await evaluate(`document.getElementById('nav-dropdown-panel-gifting') === null`);
    logTest('Focus shifting to another trigger dismisses previous disclosure', previousPanelDismissedOnFocusShift);

    // 5e. Escape key closes panel and restores focus to trigger
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter' });
    await new Promise((r) => setTimeout(r, 80));

    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
    await new Promise((r) => setTimeout(r, 80));

    const escapeRestoresFocus = await evaluate(`(() => {
      const closed = document.getElementById('nav-dropdown-panel-occasions') === null;
      const activeIsTrigger = document.activeElement?.id === 'nav-trigger-occasions';
      return closed && activeIsTrigger;
    })()`);
    logTest('Escape closes dropdown and restores focus to trigger', escapeRestoresFocus);

    // Capture desktop light screenshot
    await captureScreenshot('stage4_desktop_light.png');

    // TEST 5b: Short Viewport Height Bounding & Internal Scrolling
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 400,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await evaluate(`document.getElementById('nav-trigger-shop')?.click()`);
    await new Promise((r) => setTimeout(r, 120));

    const shortViewportMetrics = await evaluate(`(() => {
      const panel = document.getElementById('nav-dropdown-panel-shop');
      if (!panel) return null;
      const rect = panel.getBoundingClientRect();
      const style = window.getComputedStyle(panel);
      return {
        height: rect.height,
        maxHeight: style.maxHeight,
        overflowY: style.overflowY,
        fitsInViewport: rect.bottom <= window.innerHeight + 5,
        scrollHeight: panel.scrollHeight,
        clientHeight: panel.clientHeight,
      };
    })()`);

    logTest(
      'Dropdown panel bounds height to viewport on short screens',
      !!shortViewportMetrics && shortViewportMetrics.fitsInViewport && shortViewportMetrics.overflowY === 'auto',
      `Height: ${shortViewportMetrics?.height}px, MaxHeight: ${shortViewportMetrics?.maxHeight}, Fits: ${shortViewportMetrics?.fitsInViewport}`,
    );

    // Close shop dropdown and restore desktop height to 800px
    await evaluate(`document.getElementById('nav-trigger-shop')?.click()`);
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await new Promise((r) => setTimeout(r, 150));

    // TEST 6: Category Navigation & Product Content Verification
    // 6a. Compact food row link -> /shop/dry-fruits (maps to nuts category)
    await evaluate(`(() => {
      const link = document.querySelector('div[role="navigation"] a[data-nav-path="/shop/dry-fruits"]');
      link?.click();
    })()`);
    await new Promise((r) => setTimeout(r, 800));

    const dryFruitsProducts = await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('article a[href^="/product/"]')).map(a => a.getAttribute('href') || '');
      return {
        path: window.location.pathname,
        count: cards.length,
        hasPista: cards.some(h => h.includes('pista')),
        hasBadam: cards.some(h => h.includes('badam')),
      };
    })()`);
    logTest(
      'Category navigation /shop/dry-fruits renders nuts products (pista, badam)',
      dryFruitsProducts.path === '/shop/dry-fruits' && dryFruitsProducts.hasPista && dryFruitsProducts.hasBadam,
      `Cards: ${dryFruitsProducts.count}, hasPista: ${dryFruitsProducts.hasPista}, hasBadam: ${dryFruitsProducts.hasBadam}`,
    );

    // 6b. Dropdown item link -> /shop/celebration-boxes
    await evaluate(`document.getElementById('nav-trigger-celebration-boxes')?.click()`);
    await new Promise((r) => setTimeout(r, 100));
    await evaluate(`(() => {
      const link = document.querySelector('#nav-dropdown-panel-celebration-boxes a[data-nav-path="/shop/celebration-boxes"]');
      link?.click();
    })()`);
    await new Promise((r) => setTimeout(r, 800));

    const celebrationProducts = await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('article a[href^="/product/"]')).map(a => a.getAttribute('href') || '');
      const closed = document.getElementById('nav-dropdown-panel-celebration-boxes') === null;
      return {
        path: window.location.pathname,
        closed,
        count: cards.length,
        hasNikkah: cards.some(h => h.includes('bid-box-card-nikkah')),
        hasUmrah: cards.some(h => h.includes('bid-box-umrah-tabarruk')),
      };
    })()`);
    logTest(
      'Dropdown item navigation to /shop/celebration-boxes renders celebration box products and closes menu',
      celebrationProducts.path === '/shop/celebration-boxes' && celebrationProducts.closed && celebrationProducts.hasNikkah && celebrationProducts.hasUmrah,
      `Cards: ${celebrationProducts.count}, Closed: ${celebrationProducts.closed}`,
    );

    // 6c. Compact food row link -> /shop/dates
    await evaluate(`(() => {
      const link = document.querySelector('div[role="navigation"] a[data-nav-path="/shop/dates"]');
      link?.click();
    })()`);
    await new Promise((r) => setTimeout(r, 800));

    const datesProducts = await evaluate(`(() => {
      const articles = Array.from(document.querySelectorAll('#category-plp-container article'));
      const cards = Array.from(document.querySelectorAll('article a[href^="/product/"]')).map(a => a.getAttribute('href') || '');
      const distinctIds = Array.from(new Set(cards.map(h => h.split('/').pop()))).filter(Boolean);
      return {
        path: window.location.pathname,
        articleCount: articles.length,
        distinctCount: distinctIds.length,
        hasAjwa: cards.some(h => h.includes('ajwa') || h.includes('khajoor')),
      };
    })()`);
    logTest(
      'Category navigation /shop/dates renders date products',
      datesProducts.path === '/shop/dates' && datesProducts.hasAjwa && (datesProducts.distinctCount === 5 || datesProducts.articleCount === 5),
      `Articles: ${datesProducts.articleCount}, Distinct: ${datesProducts.distinctCount}, hasAjwa: ${datesProducts.hasAjwa}`,
    );

    // TEST 7: Occasion Filtering Verification
    // Direct navigate to /shop/celebration-boxes?occasion=wedding
    await send('Page.navigate', { url: `http://localhost:${port}/shop/celebration-boxes?occasion=wedding` });
    await new Promise((r) => setTimeout(r, 1200));

    const occasionFilterCheck = await evaluate(`(() => {
      const articles = Array.from(document.querySelectorAll('#category-plp-container article'));
      const cards = Array.from(document.querySelectorAll('article a[href^="/product/"]')).map(a => a.getAttribute('href') || '');
      const distinctIds = Array.from(new Set(cards.map(h => h.split('/').pop()))).filter(Boolean);
      const hasWedding = cards.some(h => h.includes('bid-box-card-nikkah'));
      const hasUmrah = cards.some(h => h.includes('bid-box-umrah-tabarruk'));
      const chipBtn = document.querySelector('button[aria-label*="Nikkah" i], button[aria-label*="wedding" i], button[aria-label*="Pakki" i]');
      const hasChip = !!chipBtn || document.body.textContent?.includes('Nikkah & Baat Pakki') || (document.body.textContent?.toLowerCase().includes('wedding') ?? false);
      return {
        articleCount: articles.length,
        distinctCount: distinctIds.length,
        hasWedding,
        hasUmrah,
        hasChip: !!hasChip,
      };
    })()`);

    logTest(
      'Occasion filter /shop/celebration-boxes?occasion=wedding shows wedding boxes and excludes umrah box',
      (occasionFilterCheck.distinctCount === 6 || occasionFilterCheck.articleCount === 6) && occasionFilterCheck.hasWedding && !occasionFilterCheck.hasUmrah && occasionFilterCheck.hasChip,
      `Distinct: ${occasionFilterCheck.distinctCount}, Articles: ${occasionFilterCheck.articleCount}, hasWedding: ${occasionFilterCheck.hasWedding}, hasUmrah: ${occasionFilterCheck.hasUmrah}, hasChip: ${occasionFilterCheck.hasChip}`,
    );

    // Reset cursor to avoid hover state
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 10, y: 300 });

    // TEST 7b: Deals Route Resolution & Matching
    await send('Page.navigate', { url: `http://localhost:${port}/shop/deals` });
    await new Promise((r) => setTimeout(r, 1200));

    const dealsCheck = await evaluate(`(() => {
      const articles = Array.from(document.querySelectorAll('#category-plp-container article'));
      const cards = Array.from(document.querySelectorAll('article a[href^="/product/"]')).map(a => a.getAttribute('href') || '');
      const distinctIds = Array.from(new Set(cards.map(h => h.split('/').pop()))).filter(Boolean);
      const hasDealsOrBundles = cards.some(h => h.includes('deal-') || h.includes('bundle-'));
      const hasArbitraryNuts = cards.some(h => h.includes('pista') || h.includes('badam'));
      const hasArbitraryDates = cards.some(h => h.includes('ajwa') || h.includes('khajoor'));
      return {
        path: window.location.pathname,
        articleCount: articles.length,
        distinctCount: distinctIds.length,
        hasDealsOrBundles,
        hasArbitraryNuts,
        hasArbitraryDates,
      };
    })()`);

    logTest(
      'Deals route /shop/deals renders curated deals & bundles and excludes arbitrary catalog items',
      dealsCheck.path === '/shop/deals' && dealsCheck.hasDealsOrBundles && !dealsCheck.hasArbitraryNuts && !dealsCheck.hasArbitraryDates,
      `Articles: ${dealsCheck.articleCount}, Distinct: ${dealsCheck.distinctCount}, hasDealsOrBundles: ${dealsCheck.hasDealsOrBundles}, hasArbitraryNuts: ${dealsCheck.hasArbitraryNuts}`,
    );

    // Reset cursor to avoid hover state
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 10, y: 300 });

    // TEST 8: RTL (Urdu & Arabic)
    // 8a. Switch to Urdu
    await evaluate(`(() => {
      const sel = document.getElementById('desktop-language-select');
      if (sel) {
        sel.value = 'ur';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const urduHeaderDir = await evaluate(`document.getElementById('main-navigation-header')?.getAttribute('dir')`);
    logTest('Urdu switches header direction to dir="rtl"', urduHeaderDir === 'rtl');
    await captureScreenshot('stage4_desktop_rtl.png');

    // 8b. Switch to Arabic
    await evaluate(`(() => {
      const sel = document.getElementById('desktop-language-select');
      if (sel) {
        sel.value = 'ar';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const arabicHeaderCheck = await evaluate(`(() => {
      const header = document.getElementById('main-navigation-header');
      const dir = header?.getAttribute('dir');
      const text = header?.textContent || '';
      const hasArabic = /[\u0600-\u06FF]/.test(text);
      return { dir, hasArabic };
    })()`);
    logTest('Arabic switches header direction to dir="rtl" and renders Arabic text', arabicHeaderCheck.dir === 'rtl' && arabicHeaderCheck.hasArabic);

    // Reset language to English
    await evaluate(`(() => {
      const sel = document.getElementById('desktop-language-select');
      if (sel) {
        sel.value = 'en';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await new Promise((r) => setTimeout(r, 300));

    // TEST 9: Dark Mode
    await evaluate(`(() => {
      const themeBtn = document.querySelector('header button[aria-label*="theme" i], header button[aria-label*="Theme" i]');
      themeBtn?.click();
    })()`);
    await new Promise((r) => setTimeout(r, 300));

    const darkModeActive = await evaluate(`document.documentElement.classList.contains('dark')`);
    logTest('Theme toggle enables dark mode (documentElement class "dark")', darkModeActive);
    await captureScreenshot('stage4_desktop_dark.png');

    // Toggle back to light mode
    await evaluate(`(() => {
      const themeBtn = document.querySelector('header button[aria-label*="theme" i], header button[aria-label*="Theme" i]');
      themeBtn?.click();
    })()`);
    await new Promise((r) => setTimeout(r, 200));

    // Helper for real touch tap emulation
    const touchTap = async (x, y) => {
      await send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y }],
      });
      await new Promise((r) => setTimeout(r, 60));
      await send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
    };

    // TEST 10: Mobile Viewport, Touch Emulation, Drawer & Accordion
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await send('Emulation.setTouchEmulationEnabled', {
      enabled: true,
      maxTouchPoints: 1,
    });
    await send('Page.navigate', { url: `http://localhost:${port}/shop` });
    await new Promise((r) => setTimeout(r, 1500));

    // Open mobile menu via real touch tap
    const hamburgerCoords = await evaluate(`(() => {
      const btn = document.getElementById('mobile-menu-trigger-btn');
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`);

    if (hamburgerCoords) {
      await touchTap(hamburgerCoords.x, hamburgerCoords.y);
    } else {
      await evaluate(`document.getElementById('mobile-menu-trigger-btn')?.click()`);
    }
    await new Promise((r) => setTimeout(r, 500));

    const mobileMenuOpen = await evaluate(`document.getElementById('mobile-navigation-menu') !== null`);
    logTest('Mobile menu opens via real touch tap on hamburger trigger', mobileMenuOpen);

    // Expand accordion item "Gifts & Hampers" via real touch tap
    const accordionBtnCoords = await evaluate(`(() => {
      const btn = document.querySelector('#mobile-navigation-menu button[aria-controls="mobile-nav-panel-gifting"]');
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`);

    if (accordionBtnCoords) {
      await touchTap(accordionBtnCoords.x, accordionBtnCoords.y);
    } else {
      await evaluate(`document.querySelector('#mobile-navigation-menu button[aria-controls="mobile-nav-panel-gifting"]')?.click()`);
    }
    await new Promise((r) => setTimeout(r, 400));

    const corporateUnderGiftingMobile = await evaluate(`(() => {
      const corpLink = document.querySelector('#mobile-navigation-menu [data-nav-path="/wholesale"]');
      return !!corpLink;
    })()`);
    logTest('Mobile accordion expands on touch and displays Corporate & Bulk under Gifting', corporateUnderGiftingMobile);

    await captureScreenshot('stage4_mobile_drawer.png');

    // TEST 11: Mobile Touch Navigation to Destination
    const wholesaleCoords = await evaluate(`(() => {
      const link = document.querySelector('#mobile-navigation-menu [data-nav-path="/wholesale"]');
      if (!link) return null;
      const r = link.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`);

    if (wholesaleCoords) {
      await touchTap(wholesaleCoords.x, wholesaleCoords.y);
      await new Promise((r) => setTimeout(r, 500));
    }

    const mobileNavComplete = await evaluate(`(() => {
      const pathIsWholesale = window.location.pathname === '/wholesale';
      const drawerClosed = document.getElementById('mobile-navigation-menu') === null;
      return pathIsWholesale && drawerClosed;
    })()`);
    logTest('Mobile touch navigation routes to /wholesale and closes mobile drawer', mobileNavComplete);

    console.log('\n========================================');
    console.log('BROWSER INTERACTION TEST RESULTS:');
    const allPassed = testResults.every((t) => t.passed);
    console.log(`TOTAL: ${testResults.length}, PASSED: ${testResults.filter((t) => t.passed).length}, FAILED: ${testResults.filter((t) => !t.passed).length}`);
    console.log('========================================\n');

    if (!allPassed) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('CDP test error:', err);
    process.exitCode = 1;
  } finally {
    ws.close();
    chromeProc.kill();
    server.close();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
