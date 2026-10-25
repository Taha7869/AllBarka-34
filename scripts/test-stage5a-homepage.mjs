import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const distDir = path.resolve('dist');
const port = 4599;
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
  const cdpPort = 9333;

  const tempUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-cdp-5a-'));

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

  const testResults = [];
  const logTest = (name, passed, detail = '') => {
    testResults.push({ name, passed, detail });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${name}${detail ? ` (${detail})` : ''}`);
  };

  try {
    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    // Set desktop viewport
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log('Navigating to http://localhost:' + port + '/');
    await send('Page.navigate', { url: `http://localhost:${port}/` });
    await new Promise((r) => setTimeout(r, 2000));

    // ── 1. Hero Verification ──────────────────────────────────────────
    const heroCtas = await evaluate(`(() => {
      const hero = document.querySelector('.heritage-hero');
      if (!hero) return null;
      const links = Array.from(hero.querySelectorAll('a')).map(a => ({
        href: a.getAttribute('href'),
        text: a.textContent.trim()
      }));
      return {
        hasHero: true,
        links
      };
    })()`);

    const hasDryFruitsCta = heroCtas?.links?.some(l => l.href === '/shop/dry-fruits' && l.text.includes('Shop Dry Fruits'));
    const hasGiftsCta = heroCtas?.links?.some(l => l.href === '/gifting' && l.text.includes('Explore Gifts'));
    logTest('Hero: Dry-fruit-led premium hero with Primary & Secondary CTAs', !!(hasDryFruitsCta && hasGiftsCta),
      `Primary: ${hasDryFruitsCta}, Secondary: ${hasGiftsCta}`);

    // ── 2. Explore Collections (CategoryCarousel) ─────────────────────
    const carouselInfo = await evaluate(`(() => {
      const carousel = document.querySelector('#allbarka-pantry');
      if (!carousel) return null;
      const links = Array.from(carousel.querySelectorAll('a')).map(a => a.getAttribute('href'));
      return {
        hasCarousel: true,
        links
      };
    })()`);
    logTest('Explore Collections: Compact destination cards present', !!carouselInfo?.hasCarousel,
      `Cards: ${carouselInfo?.links?.length || 0}`);

    // ── 3. Boutique Selections: The SINGLE product showcase ───────────
    const boutiqueInfo = await evaluate(`(() => {
      const section = document.querySelector('#boutique-selections');
      if (!section) return null;
      const tabs = Array.from(section.querySelectorAll('[role="tab"]')).map(t => ({
        id: t.id,
        text: t.textContent.trim(),
        selected: t.getAttribute('aria-selected') === 'true'
      }));
      const cards = Array.from(section.querySelectorAll('.product-card, [role="tabpanel"] article, [role="tabpanel"] > div > div')).length;
      const playPauseBtn = section.querySelector('button[aria-label*="autoplay"]');
      const oldGrids = document.querySelectorAll('.bid-boxes-section, .deals-packages-section, .boutique-bestsellers').length;

      return {
        hasSection: true,
        tabs,
        cards,
        hasPlayPause: !!playPauseBtn,
        playPauseLabel: playPauseBtn?.getAttribute('aria-label'),
        oldGridsPresent: oldGrids
      };
    })()`);

    logTest('Boutique Selections: Single product showcase mounted with 5 tabs',
      boutiqueInfo?.tabs?.length === 5 && boutiqueInfo?.cards <= 3 && boutiqueInfo.cards > 0,
      `Tabs: ${boutiqueInfo?.tabs?.length}, Cards in initial tab: ${boutiqueInfo?.cards}`);

    logTest('Boutique Selections: Initial tab is selected',
      boutiqueInfo?.tabs?.[0]?.selected === true,
      `Selected tab: ${boutiqueInfo?.tabs?.find(t => t.selected)?.text}`);

    logTest('Homepage cleanup: Absence of old large BidBox and Deals grids',
      boutiqueInfo?.oldGridsPresent === 0,
      `Old grids count: ${boutiqueInfo?.oldGridsPresent}`);

    // Test tab switching
    const tabSwitchResult = await evaluate(`(() => {
      const section = document.querySelector('#boutique-selections');
      const tabs = Array.from(section.querySelectorAll('[role="tab"]'));
      if (tabs.length < 2) return false;
      tabs[1].click();
      return true;
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const afterTabClick = await evaluate(`(() => {
      const section = document.querySelector('#boutique-selections');
      const tabs = Array.from(section.querySelectorAll('[role="tab"]'));
      return {
        secondTabSelected: tabs[1]?.getAttribute('aria-selected') === 'true',
        cards: Array.from(section.querySelectorAll('[role="tabpanel"] > div > div')).length
      };
    })()`);

    logTest('Boutique Selections: Interactive tab switching',
      afterTabClick?.secondTabSelected === true && afterTabClick?.cards > 0,
      `Second tab active: ${afterTabClick?.secondTabSelected}, cards: ${afterTabClick?.cards}`);

    // Switch back to first tab for screenshots
    await evaluate(`(() => {
      const section = document.querySelector('#boutique-selections');
      const tabs = Array.from(section.querySelectorAll('[role="tab"]'));
      tabs[0].click();
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    // Test Play/Pause toggle
    const playToggleResult = await evaluate(`(async () => {
      const btn = document.querySelector('#boutique-selections button[aria-label*="autoplay"]');
      if (!btn) return null;
      const initialPressed = btn.getAttribute('aria-pressed');
      btn.click();
      await new Promise(r => setTimeout(r, 150));
      return {
        initialPressed,
        afterClickPressed: btn.getAttribute('aria-pressed')
      };
    })()`);
    logTest('Boutique Selections: Accessible Play/Pause toggle button',
      playToggleResult?.initialPressed !== playToggleResult?.afterClickPressed,
      `Initial: ${playToggleResult?.initialPressed}, After click: ${playToggleResult?.afterClickPressed}`);

    // ── 4. Find a Gift for Your Occasion ──────────────────────────────
    const occasionInfo = await evaluate(`(() => {
      const section = document.querySelector('#gift-for-occasion');
      if (!section) return null;
      const links = Array.from(section.querySelectorAll('a')).map(a => a.getAttribute('href'));
      return {
        hasSection: true,
        links
      };
    })()`);
    const expectedDestinations = [
      '/shop/celebration-boxes?occasion=wedding',
      '/shop/celebration-boxes?occasion=umrah',
      '/shop?occasion=ramadan',
      '/shop/celebration-boxes?occasion=birth',
      '/wholesale'
    ];
    const allOccasionsMatch = expectedDestinations.every(dest => occasionInfo?.links?.includes(dest));
    logTest('Find Gift for Occasion: 5 compact destination links to approved routes',
      allOccasionsMatch,
      `Occasion links count: ${occasionInfo?.links?.length}`);

    // ── 5. Feedback & FAQ Verification ────────────────────────────────
    const feedbackFaqInfo = await evaluate(`(() => {
      const care = document.querySelector('.editorial-care');
      const reviews = document.querySelector('#about');
      const faq = document.querySelector('#faq');
      return {
        hasCare: !!care,
        hasReviews: !!reviews,
        hasFaq: !!faq
      };
    })()`);
    logTest('Feedback & FAQ: Service pillars, customer reviews, and FAQ mounted',
      feedbackFaqInfo?.hasCare && feedbackFaqInfo?.hasReviews && feedbackFaqInfo?.hasFaq,
      `Care: ${feedbackFaqInfo?.hasCare}, Reviews: ${feedbackFaqInfo?.hasReviews}, FAQ: ${feedbackFaqInfo?.hasFaq}`);

    // ── Screenshots Capture ───────────────────────────────────────────
    // 1. Desktop Light (Full Hero + Collections)
    await evaluate(`window.scrollTo(0, 0)`);
    await new Promise((r) => setTimeout(r, 500));
    await captureScreenshot('stage5a_homepage_desktop_light.png');

    // 2. Boutique Selections Scrolled View
    await evaluate(`(() => {
      const el = document.querySelector('#boutique-selections');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    })()`);
    await new Promise((r) => setTimeout(r, 600));
    await captureScreenshot('stage5a_boutique_selections.png');

    // 3. Occasions & Feedback Scrolled View
    await evaluate(`(() => {
      const el = document.querySelector('#gift-for-occasion');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    })()`);
    await new Promise((r) => setTimeout(r, 600));
    await captureScreenshot('stage5a_homepage_occasions.png');

    // 4. Mobile Viewport (390x844)
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await evaluate(`window.scrollTo(0, 0)`);
    await new Promise((r) => setTimeout(r, 600));
    await captureScreenshot('stage5a_homepage_mobile.png');

    // 5. Urdu RTL
    await evaluate(`(() => {
      localStorage.setItem('allbarka_language', 'ur');
      window.location.reload();
    })()`);
    await new Promise((r) => setTimeout(r, 2000));
    await evaluate(`window.scrollTo(0, 0)`);
    await new Promise((r) => setTimeout(r, 600));
    await captureScreenshot('stage5a_homepage_rtl_urdu.png');

    // 6. Dark Mode
    await evaluate(`(() => {
      localStorage.setItem('allbarka_language', 'en');
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
      window.location.reload();
    })()`);
    await new Promise((r) => setTimeout(r, 2000));
    await evaluate(`window.scrollTo(0, 0)`);
    await new Promise((r) => setTimeout(r, 600));
    await captureScreenshot('stage5a_homepage_dark.png');

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    try {
      ws.close();
      chromeProc.kill();
      server.close();
    } catch {}
  }

  const allPassed = testResults.length > 0 && testResults.every((t) => t.passed);
  console.log(`\n── Stage 5A Browser Interaction Summary ──`);
  console.log(`Total checks: ${testResults.length}, Passed: ${testResults.filter(t => t.passed).length}, Failed: ${testResults.filter(t => !t.passed).length}`);
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
