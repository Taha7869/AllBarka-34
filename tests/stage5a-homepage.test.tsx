import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../src/pages/HomePage';
import BoutiqueSelections from '../src/components/BoutiqueSelections';
import FindGiftOccasionSection, { OCCASION_DESTINATIONS } from '../src/components/FindGiftOccasionSection';
import { DEFAULT_MERCHANDISING } from '../src/config/merchandising';
import { CUSTOMER_FACING_CATEGORIES, CANONICAL_CATEGORIES, resolveCategorySlug } from '../src/config/categories';
import { PRODUCTS } from '../src/data/products';
import { catalogTranslations } from '../src/contexts/catalogTranslations';
import { LanguageProvider, type LanguageCode } from '../src/contexts/LanguageContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { CartProvider } from '../src/contexts/CartContext';
import { CatalogProvider } from '../src/contexts/CatalogContext';

function renderWithProviders(element: React.ReactElement, language: LanguageCode = 'en', path = '/') {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      matchMedia: () => ({
        matches: false,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      addEventListener: () => {},
      removeEventListener: () => {},
      pageXOffset: 0,
      pageYOffset: 0,
    },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key: string) => (key === 'allbarka_language' ? language : null) },
  });
  try {
    return renderToString(
      <MemoryRouter initialEntries={[path]}>
        <LanguageProvider>
          <ThemeProvider>
            <CartProvider>
              <CatalogProvider>{element}</CatalogProvider>
            </CartProvider>
          </ThemeProvider>
        </LanguageProvider>
      </MemoryRouter>
    );
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
    else Reflect.deleteProperty(globalThis, 'window');
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}

test('1. Six-part homepage structure: Hero, Collections, Boutique, Occasions, Feedback/FAQ, Footer', () => {
  const html = renderWithProviders(<HomePage />);

  // 1. Dry-fruit-led premium hero
  assert.ok(html.includes('heritage-hero'), 'Hero section must be present');
  assert.ok(html.includes('href="/shop/dry-fruits"'), 'Hero must have Primary CTA to /shop/dry-fruits');
  assert.ok(html.includes('href="/gifting"'), 'Hero must have Secondary CTA to /gifting');

  // 2. Explore Our Collections: Compact destination cards (CategoryCarousel)
  assert.ok(html.includes('editorial-pantry') || html.includes('id="allbarka-pantry"'), 'Explore collections carousel must be present');

  // 3. Boutique Selections: The SINGLE homepage product showcase
  assert.ok(html.includes('boutique-selections') || html.includes('id="boutique-selections"'), 'Boutique Selections must be present');

  // 4. Find a Gift for Your Occasion: Compact destination links
  assert.ok(html.includes('find-gift-occasion') || html.includes('id="gift-for-occasion"'), 'Find Gift for Occasion section must be present');

  // 5. Genuine feedback and essential service information/FAQ
  assert.ok(html.includes('editorial-care'), 'Service care pillars must be present');
  assert.ok(html.includes('What Our Customers Say') || html.includes('published reviews') || html.includes('id="about"'), 'Genuine feedback moving reviews must be present');
  assert.ok(html.includes('Frequently Asked Questions') || html.includes('id="faq"'), 'Essential service FAQ section must be present');

  // Verification: Old large BidBox and Deals product grids are REMOVED from HomePage
  assert.ok(!html.includes('bid-boxes-section'), 'Old large BidBoxesSection grid must not be present');
  assert.ok(!html.includes('deals-packages-section'), 'Old large DealsPackagesSection grid must not be present');
  assert.ok(!html.includes('boutique-bestsellers'), 'Old Bestsellers slider must not be present');
});

test('2. Boutique Selections taxonomy: 5 approved tabs with at most 3 admin-selected products per tab', () => {
  const tabs = DEFAULT_MERCHANDISING.showcaseTabs;
  assert.ok(Array.isArray(tabs), 'Showcase tabs must be an array');
  assert.equal(tabs.length, 5, 'Must have exactly 5 approved tabs');

  const tabIds = tabs.map(t => t.id);
  assert.deepEqual(
    tabIds,
    ['dry-fruits', 'pantry', 'gifts', 'celebration-boxes', 'deals'],
    'Tab IDs must match approved taxonomy: dry-fruits, pantry, gifts, celebration-boxes, deals'
  );

  // Each tab must have at most 3 products, and products must exist in catalog
  const catalogIds = new Set(PRODUCTS.map(p => p.id));
  for (const tab of tabs) {
    assert.ok(tab.productIds.length <= 3, `Tab ${tab.id} must have at most 3 products`);
    assert.ok(tab.productIds.length > 0, `Tab ${tab.id} must have at least 1 product`);
    for (const pid of tab.productIds) {
      assert.ok(catalogIds.has(pid), `Product ID "${pid}" in tab "${tab.id}" must exist in verified catalog`);
      const prod = PRODUCTS.find(p => p.id === pid);
      assert.notEqual(prod?.active, false, `Product "${pid}" must be active`);
    }
  }

  // Render BoutiqueSelections
  const html = renderWithProviders(<BoutiqueSelections />);
  assert.ok(html.includes('role="tablist"'), 'Must render accessible tablist');
  assert.ok(html.includes('role="tab"'), 'Must render tabs');
  assert.ok(html.includes('role="tabpanel"'), 'Must render active tabpanel');

  // Verify initial tab is Dry Fruits & Nuts
  assert.ok(html.includes('aria-selected="true"'), 'An initial tab must be selected');
  assert.ok(html.includes('dry-fruits'), 'Dry fruits tab must be present');

  // Verify Play/Pause accessible toggle
  assert.ok(
    html.includes('aria-label="Pause showcase autoplay"') ||
    html.includes('aria-label="Play showcase autoplay"'),
    'Must render accessible play/pause toggle'
  );
});

test('3. Boutique Selections reads live catalog prices and stores zero prices in merchandising', () => {
  // Merchandising config must contain ZERO prices
  const tabs = DEFAULT_MERCHANDISING.showcaseTabs;
  for (const tab of tabs) {
    assert.equal((tab as any).price, undefined, 'Merchandising tab must not store prices');
    assert.equal((tab as any).prices, undefined, 'Merchandising tab must not store prices');
  }

  // Rendering BoutiqueSelections must display actual catalog prices from PRODUCTS
  const html = renderWithProviders(<BoutiqueSelections />);
  // The first tab has 'pista', 'badam', 'chilgoza'
  // Verify formatted prices appear in HTML
  assert.ok(html.includes('Rs.'), 'Rendered cards must display catalog price currency');
  assert.ok(!html.includes('Rs. 0') && !html.includes('Free'), 'Active products must not display zero prices');
});

test('4. Find a Gift for Your Occasion: 5 compact destination links to approved routes', () => {
  assert.equal(OCCASION_DESTINATIONS.length, 5, 'Must have exactly 5 occasion destinations');

  const destinations = OCCASION_DESTINATIONS.map(d => ({ id: d.id, path: d.path }));
  assert.deepEqual(destinations, [
    { id: 'wedding', path: '/shop/celebration-boxes?occasion=wedding' },
    { id: 'umrah', path: '/shop/celebration-boxes?occasion=umrah' },
    { id: 'ramadan', path: '/shop?occasion=ramadan' },
    { id: 'birth', path: '/shop/celebration-boxes?occasion=birth' },
    { id: 'corporate', path: '/wholesale' },
  ]);

  const html = renderWithProviders(<FindGiftOccasionSection />);
  for (const dest of destinations) {
    assert.ok(html.includes(`href="${dest.path}"`), `Must render link to ${dest.path}`);
  }
});

test('5. Customer-facing category deduplication across components', () => {
  // CUSTOMER_FACING_CATEGORIES must not contain both 'nuts' and 'dry-fruits', or both 'snacks-seeds' and 'seeds-snacks'
  assert.ok(CUSTOMER_FACING_CATEGORIES.includes('dry-fruits'), 'Must include dry-fruits');
  assert.ok(!CUSTOMER_FACING_CATEGORIES.includes('nuts' as any), 'Must NOT include legacy duplicate nuts in customer-facing list');
  assert.ok(CUSTOMER_FACING_CATEGORIES.includes('seeds-snacks'), 'Must include seeds-snacks');
  assert.ok(!CUSTOMER_FACING_CATEGORIES.includes('snacks-seeds' as any), 'Must NOT include legacy duplicate snacks-seeds in customer-facing list');

  // Backward compatibility: CANONICAL_CATEGORIES and resolveCategorySlug must still resolve nuts and snacks-seeds
  assert.equal(resolveCategorySlug('nuts'), 'nuts', 'resolveCategorySlug("nuts") must resolve to nuts');
  assert.equal(resolveCategorySlug('snacks-seeds'), 'snacks-seeds', 'resolveCategorySlug("snacks-seeds") must resolve to snacks-seeds');
  assert.equal(resolveCategorySlug('dry-fruits'), 'dry-fruits', 'resolveCategorySlug("dry-fruits") must resolve to dry-fruits');
  assert.equal(resolveCategorySlug('seeds-snacks'), 'seeds-snacks', 'resolveCategorySlug("seeds-snacks") must resolve to seeds-snacks');
  assert.ok('nuts' in CANONICAL_CATEGORIES, 'CANONICAL_CATEGORIES must retain nuts key for backward compatibility');
  assert.ok('snacks-seeds' in CANONICAL_CATEGORIES, 'CANONICAL_CATEGORIES must retain snacks-seeds key for backward compatibility');
});

test('6. Multilingual translations for Stage 5A elements in EN, UR, and AR', () => {
  const languages: LanguageCode[] = ['en', 'ur', 'ar'];
  const requiredKeys = [
    'hero.shopDryFruits',
    'hero.exploreGifts',
    'boutique.showcaseTitle',
    'boutique.showcaseSubtitle',
    'boutique.showcaseEyebrow',
    'boutique.showcaseTabs',
    'boutique.viewCollection',
    'boutique.play',
    'boutique.pause',
    'boutique.playShowcase',
    'boutique.pauseShowcase',
    'home.occasionTitle',
    'home.occasionEyebrow',
    'home.occasionSubtitle',
    'occasion.weddingTitle',
    'occasion.weddingSub',
    'occasion.badgeFestive',
    'occasion.umrahTitle',
    'occasion.umrahSub',
    'occasion.badgeSpiritual',
    'occasion.ramadanTitle',
    'occasion.ramadanSub',
    'occasion.badgeSeasonal',
    'occasion.birthTitle',
    'occasion.birthSub',
    'occasion.badgeCelebration',
    'occasion.corporateTitle',
    'occasion.corporateSub',
    'occasion.badgeExecutive',
    'occasion.exploreDest',
  ];

  for (const lang of languages) {
    const dict = catalogTranslations[lang];
    assert.ok(dict, `Dictionary for ${lang} must exist`);
    for (const key of requiredKeys) {
      assert.ok(dict[key], `Translation for key "${key}" in language "${lang}" must be non-empty`);
      assert.notEqual(dict[key].trim(), '', `Translation for key "${key}" in language "${lang}" must not be blank`);
    }
  }

  // Render in UR and AR to verify RTL container attributes
  const urHtml = renderWithProviders(<HomePage />, 'ur');
  assert.ok(urHtml.includes('dir="rtl"'), 'Urdu homepage must include dir="rtl"');
  assert.ok(urHtml.includes('تسوق الفواكه المجففة') || urHtml.includes('خشک میوہ جات'), 'Urdu translations must render');

  const arHtml = renderWithProviders(<HomePage />, 'ar');
  assert.ok(arHtml.includes('dir="rtl"'), 'Arabic homepage must include dir="rtl"');
  assert.ok(arHtml.includes('تسوق الفواكه المجففة'), 'Arabic translations must render');
});
