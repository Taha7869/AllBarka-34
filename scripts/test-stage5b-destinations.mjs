import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

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

  try {
    await send('Page.enable');
    await send('DOM.enable');

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

    console.log('\nAll Stage 5B screenshots successfully captured!');
  } catch (err) {
    console.error('Screenshot capture error:', err);
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
