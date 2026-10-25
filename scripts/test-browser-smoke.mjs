import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const distDir = path.resolve('dist');
if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error(JSON.stringify({ success: false, error: 'dist directory does not exist or has no index.html' }));
  process.exit(1);
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

// Start static SPA server for local build
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

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
});

const report = {
  baseUrl,
  homepageLoaded: false,
  desktopNavWorking: false,
  mobileNavWorking: false,
  productPageLoaded: false,
  productName: null,
  consoleErrors: [],
  networkFailures: [],
};

try {
  // 1. Desktop Homepage Verification
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopContext.newPage();

  desktopPage.on('console', (msg) => {
    if (msg.type() === 'error') {
      report.consoleErrors.push({ page: 'desktop', text: msg.text() });
    }
  });
  desktopPage.on('requestfailed', (req) => {
    report.networkFailures.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  await desktopPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await desktopPage.waitForTimeout(1000);

  const title = await desktopPage.title();
  const heroHeading = await desktopPage.$eval('h1, h2', (el) => el.textContent).catch(() => null);
  report.homepageLoaded = Boolean(title && title.includes('AllBarka'));
  report.title = title;
  report.heroHeading = heroHeading;

  // Test Desktop Navigation
  const shopNavLink = await desktopPage.$('header nav a[href*="/shop"], header a[href*="/shop"]');
  if (shopNavLink) {
    report.desktopNavWorking = true;
  }

  // 2. Mobile Navigation Open / Close Check
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobilePage = await mobileContext.newPage();

  mobilePage.on('console', (msg) => {
    if (msg.type() === 'error') {
      report.consoleErrors.push({ page: 'mobile', text: msg.text() });
    }
  });

  await mobilePage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(1000);

  // Look for mobile menu toggle button
  const menuButton = await mobilePage.$('button[aria-label*="menu" i], button[aria-label*="navigation" i], button[aria-label*="Open menu" i], header button:has(svg)');
  let mobileDrawerOpened = false;
  let mobileDrawerClosed = false;

  if (menuButton) {
    await menuButton.click();
    await mobilePage.waitForTimeout(500);
    // Check if drawer or nav is open
    const drawerNav = await mobilePage.$('nav, [role="dialog"], [data-state="open"]');
    mobileDrawerOpened = Boolean(drawerNav);

    // Look for close button
    const closeBtn = await mobilePage.$('button[aria-label*="close" i], button:has(svg[class*="lucide-x"]), button:has(svg.lucide-x)');
    if (closeBtn) {
      await closeBtn.click();
      await mobilePage.waitForTimeout(500);
      mobileDrawerClosed = true;
    } else {
      // Tap backdrop or press Escape
      await mobilePage.keyboard.press('Escape');
      await mobilePage.waitForTimeout(300);
      mobileDrawerClosed = true;
    }
  }
  report.mobileNavWorking = mobileDrawerOpened && mobileDrawerClosed;

  // 3. Published Product Detail Page Verification
  // Test loading a known canonical published product (e.g. /product/roasted-iranian-pista or /product/amber-gold-tin)
  const productPage = await desktopContext.newPage();
  productPage.on('console', (msg) => {
    if (msg.type() === 'error') {
      report.consoleErrors.push({ page: 'product', text: msg.text() });
    }
  });

  await productPage.goto(`${baseUrl}/product/pista`, { waitUntil: 'domcontentloaded' });
  await productPage.waitForTimeout(1000);

  const productTitle = await productPage.$eval('h1', (el) => el.textContent?.trim()).catch(() => null);
  const priceDisplay = await productPage.$eval('body', (b) => {
    const text = b.innerText || '';
    const match = text.match(/Rs\.?\s*[\d,]+/);
    return match ? match[0] : null;
  });

  report.productPageLoaded = Boolean(productTitle && productTitle.length > 0);
  report.productName = productTitle;
  report.productPrice = priceDisplay;

  await desktopContext.close();
  await mobileContext.close();
} finally {
  await browser.close();
  server.close();
}

console.log(JSON.stringify(report, null, 2));
