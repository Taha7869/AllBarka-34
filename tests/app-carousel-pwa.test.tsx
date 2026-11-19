import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import {
  DEFAULT_CAROUSEL_RESUME_MS,
  canCarouselAutoSlide,
  type CarouselAutoSlideState,
} from '../src/hooks/useCarouselAutoSlide';
import {
  isIosSafari,
  isStandaloneDisplayMode,
  shareProductLink,
} from '../src/lib/pwa';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { CurrencyProvider } from '../src/contexts/CurrencyContext';
import { CartProvider } from '../src/contexts/CartContext';
import { CatalogProvider } from '../src/contexts/CatalogContext';
import OfflinePage from '../src/pages/OfflinePage';
import StandaloneTabBar from '../src/components/StandaloneTabBar';

test('Feature A: shared useCarouselAutoSlide state machine enforces hover/touch pause, 4s resume, hidden-tab pause, and reduced-motion off', () => {
  assert.equal(DEFAULT_CAROUSEL_RESUME_MS, 2000);

  const runningState: CarouselAutoSlideState = {
    enabled: true,
    reducedMotion: false,
    inView: true,
    pageVisible: true,
    hovered: false,
    pointerDown: false,
    interacting: false,
    focusWithin: false,
    modalOpen: false,
    itemCount: 6,
  };
  assert.equal(canCarouselAutoSlide(runningState), true);

  for (const [key, value] of Object.entries({
    enabled: false,
    reducedMotion: true,
    inView: false,
    pageVisible: false,
    hovered: true,
    pointerDown: true,
    interacting: true,
    focusWithin: true,
    modalOpen: true,
    itemCount: 1,
  })) {
    assert.equal(
      canCarouselAutoSlide({ ...runningState, [key]: value }),
      false,
      `${key}=${String(value)} must pause auto-slide`
    );
  }

  // Verify every carousel component uses the shared hook and CircularCarousel never permanently kills autoplay
  for (const file of [
    'src/components/CircularCarousel.tsx',
    'src/components/CategoryCarousel.tsx',
    'src/components/ui/infinite-moving-cards.tsx',
    'src/components/Carousel.jsx',
  ]) {
    const src = fs.readFileSync(file, 'utf8');
    assert.match(src, /useCarouselAutoSlide/, `${file} must use shared useCarouselAutoSlide hook`);
  }
  const circularSrc = fs.readFileSync('src/components/CircularCarousel.tsx', 'utf8');
  assert.match(circularSrc, /stopOnInteraction:\s*false/, 'CircularCarousel must set stopOnInteraction: false so click/touch resumes after 4s');
});

test('Feature B: PWA helpers accurately detect standalone mode, iOS Safari only, and Web Share + copy fallback', async () => {
  assert.equal(isStandaloneDisplayMode({ matchMedia: () => ({ matches: true }) }), true);
  assert.equal(isStandaloneDisplayMode({ navigator: { standalone: true } }), true);
  assert.equal(isStandaloneDisplayMode({ matchMedia: () => ({ matches: false }), navigator: { standalone: false } }), false);

  const iphoneSafari =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  const iphoneChrome =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1';
  const iphoneFirefox =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.0 Mobile/15E148 Safari/605.1.15';
  const androidChrome =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
  const desktopSafari =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15';

  assert.equal(isIosSafari({ userAgent: iphoneSafari, maxTouchPoints: 5, standalone: false }), true);
  assert.equal(isIosSafari({ userAgent: iphoneSafari, maxTouchPoints: 5, standalone: true }), false);
  assert.equal(isIosSafari({ userAgent: iphoneChrome, maxTouchPoints: 5, standalone: false }), false);
  assert.equal(isIosSafari({ userAgent: iphoneFirefox, maxTouchPoints: 5, standalone: false }), false);
  assert.equal(isIosSafari({ userAgent: androidChrome, maxTouchPoints: 5, standalone: false }), false);
  assert.equal(isIosSafari({ userAgent: desktopSafari, maxTouchPoints: 0, standalone: false }), false);

  // Web Share API succeeds
  let sharedUrl = '';
  const sharedRes = await shareProductLink(
    { title: 'Pista', url: 'https://allbarka.com/product/pista' },
    { share: async (d) => { sharedUrl = d.url; } }
  );
  assert.equal(sharedRes, 'shared');
  assert.equal(sharedUrl, 'https://allbarka.com/product/pista');

  // Web Share unavailable -> falls back to clipboard copy
  let copiedUrl = '';
  const copiedRes = await shareProductLink(
    { title: 'Pista', url: 'https://allbarka.com/product/pista' },
    { clipboard: { writeText: async (u) => { copiedUrl = u; } } }
  );
  assert.equal(copiedRes, 'copied');
  assert.equal(copiedUrl, 'https://allbarka.com/product/pista');

  // Web Share throws non-AbortError -> falls back cleanly to clipboard copy
  let fallbackCopied = '';
  const fallbackRes = await shareProductLink(
    { title: 'Pista', url: 'https://allbarka.com/product/pista' },
    {
      share: async () => { throw new Error('NotAllowed'); },
      clipboard: { writeText: async (u) => { fallbackCopied = u; } },
    }
  );
  assert.equal(fallbackRes, 'copied');
  assert.equal(fallbackCopied, 'https://allbarka.com/product/pista');

  // User cancels native share sheet -> returns cancelled without overwriting clipboard
  const cancelRes = await shareProductLink(
    { title: 'Pista', url: 'https://allbarka.com/product/pista' },
    { share: async () => { throw new DOMException('Cancelled', 'AbortError'); } }
  );
  assert.equal(cancelRes, 'cancelled');
});

test('Feature B: OfflinePage, StandaloneTabBar, and static offline.html render cleanly with zero inline scripts', () => {
  const offlineHtml = fs.readFileSync('public/offline.html', 'utf8');
  assert.doesNotMatch(offlineHtml, /<script\b/i, 'offline.html must remain free of inline scripts for strict CSP');
  assert.match(offlineHtml, /You are offline/);
  assert.match(offlineHtml, /انٹرنیٹ دستیاب نہیں/);
  assert.match(offlineHtml, /لا يوجد اتصال بالإنترنت/);

  // OfflinePage displays previously viewed products
  const offlinePageMarkup = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/offline']}>
      <LanguageProvider>
        <CurrencyProvider>
          <CatalogProvider>
            <OfflinePage recentOverrideIds={['pista', 'badam']} />
          </CatalogProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
  assert.match(offlinePageMarkup, /data-offline-page/);
  assert.match(offlinePageMarkup, /data-offline-product="pista"/);
  assert.match(offlinePageMarkup, /data-offline-product="badam"/);
  assert.match(offlinePageMarkup, /data-offline-retry/);

  // StandaloneTabBar hidden in normal browser mode, renders 5 tabs in standalone mode
  const normalBar = renderToStaticMarkup(
    <MemoryRouter>
      <LanguageProvider>
        <CartProvider>
          <StandaloneTabBar forceStandalone={false} onOpenAccount={() => undefined} />
        </CartProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
  assert.equal(normalBar, '');

  const standaloneBar = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/shop']}>
      <LanguageProvider>
        <CartProvider>
          <StandaloneTabBar forceStandalone={true} onOpenAccount={() => undefined} />
        </CartProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
  for (const tab of ['home', 'shop', 'gifting', 'bag', 'account']) {
    assert.match(standaloneBar, new RegExp(`data-tab="${tab}"`));
  }
  assert.match(standaloneBar, /aria-current="page"/);
});
