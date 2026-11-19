import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

test('Feature B: Web App Manifest verification', () => {
  const manifestPath = path.join(ROOT_DIR, 'public', 'manifest.webmanifest');
  assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist in public directory');

  const content = fs.readFileSync(manifestPath, 'utf-8');
  let manifest: any;
  assert.doesNotThrow(() => {
    manifest = JSON.parse(content);
  }, 'manifest.webmanifest must be valid JSON');

  assert.equal(manifest.name, 'AllBarka');
  assert.equal(manifest.short_name, 'AllBarka');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#042821');
  assert.equal(manifest.background_color, '#F6F1EA');

  assert.ok(Array.isArray(manifest.icons), 'icons must be an array');
  assert.ok(manifest.icons.length >= 2, 'manifest must specify at least 192 and 512 icons');

  const icon192 = manifest.icons.find((i: any) => i.sizes === '192x192');
  assert.ok(icon192, '192x192 icon must be specified');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'public', icon192.src)), `Icon file ${icon192.src} must exist`);

  const icon512 = manifest.icons.find((i: any) => i.sizes === '512x512');
  assert.ok(icon512, '512x512 icon must be specified');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'public', icon512.src)), `Icon file ${icon512.src} must exist`);

  // Verify PWA app shortcuts (Shop, Gifting, Track order, Bag)
  assert.ok(Array.isArray(manifest.shortcuts), 'shortcuts must be an array');
  const shortcutUrls = manifest.shortcuts.map((s: any) => s.url);
  for (const expectedUrl of ['/shop', '/gifting', '/track', '/cart']) {
    assert.ok(shortcutUrls.includes(expectedUrl), `manifest shortcuts must include ${expectedUrl}`);
  }
});

test('Feature B: Service Worker static-only safety rules verification', () => {
  const swPath = path.join(ROOT_DIR, 'public', 'sw.js');
  assert.ok(fs.existsSync(swPath), 'sw.js must exist in public directory');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'public', 'offline.html')), 'offline.html must exist in public directory');

  const swContent = fs.readFileSync(swPath, 'utf-8');

  // Verify strict bypass rules are present in source code
  assert.ok(swContent.includes("pathname.startsWith('/api/')"), 'sw.js must strictly bypass /api/ routes');
  assert.ok(swContent.includes("pathname.startsWith('/checkout')"), 'sw.js must strictly bypass /checkout routes');
  assert.ok(swContent.includes("pathname.startsWith('/admin')"), 'sw.js must strictly bypass /admin routes');
  assert.ok(swContent.includes("pathname.startsWith('/staff')"), 'sw.js must strictly bypass /staff routes');
  assert.ok(swContent.includes("request.method !== 'GET'"), 'sw.js must strictly bypass non-GET requests');
  assert.ok(swContent.includes("'/offline.html'"), 'sw.js must precache /offline.html fallback');
});

test('Feature B: HTML and Helmet CSP PWA headers verification', () => {
  const htmlPath = path.join(ROOT_DIR, 'index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

  assert.ok(htmlContent.includes('<link rel="manifest" href="/manifest.webmanifest">'), 'index.html must include manifest link');
  assert.ok(htmlContent.includes('<meta name="theme-color" content="#042821">'), 'index.html must specify theme-color');

  const serverPath = path.join(ROOT_DIR, 'server.ts');
  const serverContent = fs.readFileSync(serverPath, 'utf-8');
  assert.ok(serverContent.includes("manifestSrc: [\"'self'\"]"), 'server.ts CSP must permit manifest-src self');
  assert.ok(serverContent.includes("workerSrc: [\"'self'\"]"), 'server.ts CSP must permit worker-src self');
});
