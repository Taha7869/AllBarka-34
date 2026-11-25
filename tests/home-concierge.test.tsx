import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { build } from 'esbuild';
import { launchTestBrowser } from './helpers/browser.mjs';
import { createVoiceRouter } from '../src/lib/voiceRouter';
import {
  OPEN_CONCIERGE_EVENT,
  normalizeOpenConciergeDetail,
} from '../src/lib/conciergeEvent';
import { conciergeTranslations } from '../src/contexts/conciergeTranslations';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { CatalogProvider } from '../src/contexts/CatalogContext';
import { MerchandisingProvider } from '../src/contexts/MerchandisingContext';
import { ProductMediaProvider } from '../src/contexts/ProductMediaContext';
import { CartProvider } from '../src/contexts/CartContext';
import { StorefrontContentProvider } from '../src/contexts/StorefrontContentContext';
import HomePage from '../src/pages/HomePage';
import { PRODUCTS } from '../src/data/products';

test('normalizeOpenConciergeDetail sanitizes inputs and caps message length', () => {
  assert.deepEqual(normalizeOpenConciergeDetail(null), {});
  assert.deepEqual(normalizeOpenConciergeDetail({}), {});
  assert.deepEqual(normalizeOpenConciergeDetail({ message: 'Badam ka rate' }), { message: 'Badam ka rate' });
  assert.deepEqual(normalizeOpenConciergeDetail({ message: 'Ajwa khajoor', autoSend: true }), {
    message: 'Ajwa khajoor',
    autoSend: true,
  });
  assert.deepEqual(normalizeOpenConciergeDetail({ message: 'Ajwa', autoSend: 'yes' }), { message: 'Ajwa' });
  assert.equal(normalizeOpenConciergeDetail({ message: 'a'.repeat(1500) }).message?.length, 1000);
});

test('HomeConciergeSection renders in HomePage with a11y labels, 4 chips, AI disclosure, and zero health/stat claims across EN/UR/AR', () => {
  const bannedCopy = /\b(antimicrobial|antioxidant|anti-inflammatory|immunity|immun\w*|cures?|heals?|prevents?|treats?|detox|medicinal|diabetes|cancer|boosts?|24\/7|99%|10,000)\b/i;

  for (const lang of ['en', 'ur', 'ar'] as const) {
    const dict = conciergeTranslations[lang];
    const keys = [
      'homeConcierge.eyebrow',
      'homeConcierge.heading',
      'homeConcierge.intro',
      'homeConcierge.placeholder',
      'homeConcierge.inputLabel',
      'homeConcierge.send',
      'homeConcierge.sendAria',
      'homeConcierge.suggestionsLabel',
      'homeConcierge.chipWedding',
      'homeConcierge.chipAlmond',
      'homeConcierge.chipDelivery',
      'homeConcierge.chipAjwa',
      'homeConcierge.aiNotice',
    ] as const;

    for (const key of keys) {
      const value = dict[key];
      assert.ok(value && value.trim().length > 0, `Missing ${lang} translation for ${key}`);
      assert.doesNotMatch(value, bannedCopy, `Disallowed wording in ${lang}.${key}: ${value}`);
    }

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider>
          <LanguageProvider initialLanguage={lang}>
            <CatalogProvider initialProducts={PRODUCTS}>
              <MerchandisingProvider>
                <ProductMediaProvider>
                  <CartProvider>
                    <StorefrontContentProvider>
                      <HomePage />
                    </StorefrontContentProvider>
                  </CartProvider>
                </ProductMediaProvider>
              </MerchandisingProvider>
            </CatalogProvider>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    assert.match(html, /data-testid="home-concierge-section"/);
    assert.match(html, /id="ask-barkat"/);
    assert.match(html, /aria-labelledby="home-concierge-heading"/);
    assert.match(html, new RegExp(`id="ask-barkat"[^>]*dir="${lang === 'en' ? 'ltr' : 'rtl'}"|dir="${lang === 'en' ? 'ltr' : 'rtl'}"[^>]*id="ask-barkat"`));
    assert.ok(html.includes(dict['homeConcierge.heading']), `${lang} heading missing`);
    assert.ok(html.includes(dict['homeConcierge.intro']), `${lang} intro missing`);
    assert.ok(html.includes(dict['homeConcierge.aiNotice']), `${lang} AI disclosure missing`);
    assert.ok(html.includes(dict['homeConcierge.inputLabel']), `${lang} input label missing`);
    assert.ok(html.includes(dict['homeConcierge.sendAria']), `${lang} send aria-label missing`);
    assert.ok(html.includes(dict['homeConcierge.suggestionsLabel']), `${lang} chips group aria-label missing`);

    // Must sit after Hero and before admin-reordered content sections
    const heroIdx = html.indexOf('data-testid="premium-hero-prototype"');
    const conciergeIdx = html.indexOf('data-testid="home-concierge-section"');
    const firstContentIdx = html.indexOf('data-content-section=');
    assert.ok(heroIdx >= 0 && conciergeIdx > heroIdx && firstContentIdx > conciergeIdx, 'Barkat section must sit directly after hero and before [data-content-section]');
  }

  // Exact 4 chips in default EN view
  const en = conciergeTranslations.en;
  assert.equal(en['homeConcierge.heading'], 'Barkat se poochiye');
  assert.equal(en['homeConcierge.chipWedding'], 'Shaadi ke liye gift box');
  assert.equal(en['homeConcierge.chipAlmond'], 'Badam ka rate');
  assert.equal(en['homeConcierge.chipDelivery'], 'Delivery kitne din mein?');
  assert.equal(en['homeConcierge.chipAjwa'], 'Ajwa khajoor');
  assert.match(en['homeConcierge.aiNotice'], /AI assistant/i);
});

test('Home Concierge browser flow: window event open+prefill, chips autoSend, voice transcript, 503 voice fallback, 375px/1440px light & dark', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-home-concierge-'));
  const entry = `
    import React, { useEffect } from 'react';
    import { createRoot } from 'react-dom/client';
    import { BrowserRouter, Routes, Route } from 'react-router-dom';
    import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
    import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
    import { CurrencyProvider } from './src/contexts/CurrencyContext';
    import { ConsentProvider } from './src/contexts/ConsentContext';
    import { CatalogProvider } from './src/contexts/CatalogContext';
    import { MerchandisingProvider } from './src/contexts/MerchandisingContext';
    import { ProductMediaProvider } from './src/contexts/ProductMediaContext';
    import { CartProvider } from './src/contexts/CartContext';
    import { StorefrontContentProvider } from './src/contexts/StorefrontContentContext';
    import RootLayout from './src/layouts/RootLayout';
    import HomePage from './src/pages/HomePage';
    import { CONSENT_STORAGE_KEY, CONSENT_POLICY_VERSION } from './src/lib/consent';
    import { PRODUCTS } from './src/data/products';

    function Controls() {
      const { setLanguage } = useLanguage();
      const { setTheme } = useTheme();
      useEffect(() => {
        window.fixture.lang = setLanguage;
        window.fixture.theme = setTheme;
      }, [setLanguage, setTheme]);
      return null;
    }

    window.fixture = { mode: 'ok', tracksStopped: 0, voices: [], spoken: [], speechCancels: 0 };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      anonymousId: 'fixture-home-concierge-01',
      policyVersion: CONSENT_POLICY_VERSION,
      updatedAt: new Date().toISOString(),
      categories: { necessary: true, analytics: false, marketing: false },
    }));

    createRoot(document.getElementById('root')).render(
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <ConsentProvider>
                <CatalogProvider initialProducts={PRODUCTS}>
                  <MerchandisingProvider>
                    <ProductMediaProvider>
                      <CartProvider>
                        <StorefrontContentProvider>
                          <Controls />
                          <Routes>
                            <Route path="/" element={<RootLayout />}>
                              <Route index element={<HomePage />} />
                            </Route>
                          </Routes>
                        </StorefrontContentProvider>
                      </CartProvider>
                    </ProductMediaProvider>
                  </MerchandisingProvider>
                </CatalogProvider>
              </ConsentProvider>
            </CurrencyProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    );
  `;

  await build({
    stdin: { contents: entry, loader: 'tsx', resolveDir: process.cwd() },
    bundle: true,
    platform: 'browser',
    format: 'esm',
    splitting: true,
    outdir: temporary,
    entryNames: 'fixture',
    jsx: 'automatic',
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [
      {
        name: 'isolated-auth',
        setup(builder) {
          builder.onResolve({ filter: /\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'fixture' }));
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
            contents: 'export const useAuth = () => ({ currentUser: null, patronProfile: null, loading: false, logout: async () => {}, refreshProfile: async () => {}, ensureAuthReady: () => {} });',
          }));
        },
      },
    ],
  });

  const chatRequests: string[] = [];
  let voiceUnavailable = false;
  let transcriptText = 'Badam 1kg rate';

  const app = express();
  app.use(express.json());
  app.use(
    createVoiceRouter({
      authenticateOptionalUser: (_req, _res, next) => next(),
      limiter: (_req, _res, next) => next(),
      getConfig: () => (voiceUnavailable ? null : { key: 'isolated-fixture', model: 'whisper-large-v3' }),
      fetcher: async (_url, init) => {
        const file = (init!.body as FormData).get('file') as Blob;
        return new Response(JSON.stringify({ text: transcriptText, duration: (file.size - 44) / 32000, segments: [] }));
      },
    }),
  );
  app.post('/api/concierge/chat', (req, res) => {
    const userText = String(req.body?.userText || '');
    chatRequests.push(userText);
    res.json({
      available: true,
      action: 'answer',
      text: `Assalam-o-Alaikum! Here is our catalogue guide for "${userText}".`,
    });
  });
  app.use('/fixture', express.static(temporary));
  app.use('/assets', express.static(path.resolve('dist/assets')));
  app.use('/images', express.static(path.resolve('public/images')));
  app.use('/fonts', express.static(path.resolve('public/fonts')));

  const distHtml = await fs.readFile('dist/index.html', 'utf8');
  const cssLinks = [...distHtml.matchAll(/<link\b[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g)]
    .map((m) => `<link rel="stylesheet" href="${m[1]}">`)
    .join('');

  app.get(/.*/, (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(503).json({ code: 'ISOLATED_FIXTURE' });
    res
      .type('html')
      .send(
        `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${cssLinks}</head><body><div id="root"></div><script type="module" src="/fixture/fixture.js"></script></body></html>`,
      );
  });

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const browser = await launchTestBrowser();

  try {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.fulfill({ status: 200, body: '' }),
    );
    await context.addInitScript({
      content: `(() => {
        const get = () => window.fixture;
        Object.defineProperty(navigator, 'mediaDevices', {
          configurable: true,
          value: {
            getUserMedia: async () => ({
              getTracks: () => [{ stop: () => { get().tracksStopped++; } }],
            }),
          },
        });
        class Recorder {
          state = 'inactive';
          mimeType = 'audio/webm';
          ondataavailable;
          onstop;
          static isTypeSupported() { return true; }
          start() { this.state = 'recording'; }
          stop() {
            this.state = 'inactive';
            queueMicrotask(() => {
              this.ondataavailable?.({ data: new Blob(['fixture']) });
              this.onstop?.();
            });
          }
        }
        class Audio {
          async decodeAudioData() { return { duration: 1 }; }
          async close() {}
        }
        class Offline {
          constructor(_channels, length) { this.length = length; }
          destination = {};
          createBufferSource() { return { connect() {}, start() {} }; }
          async startRendering() {
            return { getChannelData: () => Float32Array.from({ length: this.length }, (_, i) => Math.sin(i / 10) * 0.1) };
          }
        }
        Object.assign(window, { MediaRecorder: Recorder, AudioContext: Audio, OfflineAudioContext: Offline });
      })();`,
    });

    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(origin);
    const section = page.getByTestId('home-concierge-section');
    await section.waitFor({ state: 'visible' });

    // Verify 375px compact layout, touch targets >= 44px, and zero page overflow in light & dark
    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate((t) => (window as any).fixture.theme(t), theme);
      await page.waitForFunction(
        (isDark) => document.documentElement.classList.contains('dark') === isDark,
        theme === 'dark',
      );
      const metrics = await page.evaluate(() => {
        const sec = document.querySelector('[data-testid="home-concierge-section"]')!;
        const input = sec.querySelector('input[type="text"]')!;
        const submit = sec.querySelector('button[type="submit"]')!;
        const mic = sec.querySelector('[data-voice-control] button')!;
        const chipsWrap = sec.querySelector('[data-testid="home-concierge-chips"]')!;
        const chips = Array.from(chipsWrap.querySelectorAll('button'));
        return {
          docOverflow: document.documentElement.scrollWidth > window.innerWidth,
          inputHeight: input.getBoundingClientRect().height,
          submitBox: submit.getBoundingClientRect(),
          micBox: mic.getBoundingClientRect(),
          chipsOverflowX: getComputedStyle(chipsWrap).overflowX,
          chipsScrollable: chipsWrap.scrollWidth > chipsWrap.clientWidth,
          chipBoxes: chips.map((c) => ({
            text: c.textContent?.trim(),
            w: c.getBoundingClientRect().width,
            h: c.getBoundingClientRect().height,
          })),
          floatingLauncherPresent: Boolean(document.querySelector('[data-ai-buddy-launcher="true"]')),
        };
      });
      assert.equal(metrics.docOverflow, false, `375px ${theme} must not overflow horizontally`);
      assert.ok(metrics.inputHeight >= 44, `Input height must be >= 44px, got ${metrics.inputHeight}`);
      assert.ok(metrics.submitBox.width >= 44 && metrics.submitBox.height >= 44, 'Send button must be >= 44x44px');
      assert.ok(metrics.micBox.width >= 44 && metrics.micBox.height >= 44, 'Voice button must be >= 44x44px');
      assert.equal(metrics.chipsOverflowX, 'auto', 'Mobile chips must scroll horizontally');
      assert.equal(metrics.chipsScrollable, true, '4 chips should horizontally scroll on 375px');
      assert.equal(metrics.chipBoxes.length, 4);
      for (const chip of metrics.chipBoxes) {
        assert.ok(chip.h >= 44 && chip.w >= 44, `Chip "${chip.text}" must be >= 44x44px`);
      }
      assert.equal(metrics.floatingLauncherPresent, true, 'Existing floating AB AI launcher must remain intact');
    }

    // 1. Custom event BEFORE AIConcierge mounts: opens chat + fills input without autoSend
    await page.evaluate((eventName) => {
      window.dispatchEvent(new CustomEvent(eventName, { detail: { message: 'Kaju 500g price' } }));
    }, OPEN_CONCIERGE_EVENT);
    const dialog = page.getByRole('dialog', { name: 'AllBarka Concierge' });
    await dialog.waitFor({ state: 'visible' });
    const chatInput = dialog.locator('form input[type="text"]');
    assert.equal(await chatInput.inputValue(), 'Kaju 500g price');
    assert.equal(chatRequests.length, 0, 'Event without autoSend must not send automatically');

    // Close dialog via Escape
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });

    // 2. Event AFTER AIConcierge is already mounted: opens chat + prefill again without autoSend
    await page.evaluate((eventName) => {
      window.dispatchEvent(new CustomEvent(eventName, { detail: { message: 'Pista 250g', autoSend: false } }));
    }, OPEN_CONCIERGE_EVENT);
    await dialog.waitFor({ state: 'visible' });
    assert.equal(await chatInput.inputValue(), 'Pista 250g');
    assert.equal(chatRequests.length, 0);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });

    // 3. Clicking a suggestion chip dispatches event with autoSend: true and sends once
    await section.getByRole('button', { name: 'Badam ka rate', exact: true }).click();
    await dialog.waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelector('#allbarka-concierge-panel')?.textContent?.includes('Here is our catalogue guide for "Badam ka rate"'));
    assert.deepEqual(chatRequests, ['Badam ka rate']);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });

    // 4. VoiceInputButton inside Home section populates the Home input (no auto-send on transcript)
    const homeInput = section.getByRole('textbox', { name: 'Ask Barkat AI assistant' });
    await section.getByRole('button', { name: 'Speak your request', exact: true }).click();
    await section.getByRole('button', { name: 'Stop recording', exact: true }).click();
    await section.getByRole('textbox', { name: 'Edit transcript', exact: true }).waitFor({ state: 'visible' });
    await section.getByRole('button', { name: 'Use this text', exact: true }).click();
    assert.equal(await homeInput.inputValue(), 'Badam 1kg rate');
    assert.equal(chatRequests.length, 1, 'Using voice transcript must fill input without auto-sending');

    // Submitting the populated home input opens concierge and auto-sends
    await section.getByRole('button', { name: 'Send question to Barkat AI assistant', exact: true }).click();
    await dialog.waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelector('#allbarka-concierge-panel')?.textContent?.includes('Here is our catalogue guide for "Badam 1kg rate"'));
    assert.deepEqual(chatRequests, ['Badam ka rate', 'Badam 1kg rate']);
    assert.equal(await homeInput.inputValue(), '');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });

    // 5. Voice provider 503 VOICE_PROVIDER_UNAVAILABLE shows clean short message without breaking page
    voiceUnavailable = true;
    await section.getByRole('button', { name: 'Speak your request', exact: true }).click();
    await section.getByRole('button', { name: 'Stop recording', exact: true }).click();
    const alert = section.getByRole('alert');
    await alert.waitFor({ state: 'visible' });
    const voiceRegionText = await section.getByRole('region', { name: 'Voice input' }).innerText();
    assert.match(voiceRegionText, /Voice input is unavailable right now/i);
    assert.match(voiceRegionText, /continue by typing/i);
    await section.getByRole('button', { name: 'Cancel voice input', exact: true }).click();

    // Typing + sending still works cleanly after 503 voice error
    await homeInput.fill('Ajwa khajoor');
    await section.getByRole('button', { name: 'Send question to Barkat AI assistant', exact: true }).click();
    await dialog.waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelector('#allbarka-concierge-panel')?.textContent?.includes('Here is our catalogue guide for "Ajwa khajoor"'));
    assert.deepEqual(chatRequests, ['Badam ka rate', 'Badam 1kg rate', 'Ajwa khajoor']);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });

    // 6. Existing floating launcher button still opens the concierge dialog cleanly
    await page.getByRole('button', { name: /Open AllBarka concierge/i }).click();
    await dialog.waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });

    assert.deepEqual(pageErrors, []);
    await context.close();
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
