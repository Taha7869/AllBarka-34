import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { MAIN_NAV_ITEMS, COMPACT_FOOD_NAV_ITEMS } from '../src/config/navigation';
import { resolveCategorySlug, CANONICAL_CATEGORIES, CATEGORY_ALIASES } from '../src/config/categories';
import BubbleMenu from '../src/components/BubbleMenu';
import MobileMenu from '../src/components/MobileMenu';
import { LanguageProvider, type LanguageCode } from '../src/contexts/LanguageContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { CartProvider } from '../src/contexts/CartContext';
import { catalogTranslations } from '../src/contexts/catalogTranslations';

function render(element: React.ReactElement, language: LanguageCode = 'en', path = '/') {
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
            <CartProvider>{element}</CartProvider>
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

test('1. Two-level header taxonomy: Main row and Compact food row match the approved specification', () => {
  // Main row verification
  const mainIds = MAIN_NAV_ITEMS.map((item) => item.id);
  assert.deepEqual(mainIds, ['shop', 'gifting', 'celebration-boxes', 'occasions', 'deals']);

  // Compact food row verification: exactly 6 food categories
  const foodIds = COMPACT_FOOD_NAV_ITEMS.map((item) => item.id);
  assert.deepEqual(foodIds, ['dry-fruits', 'dates', 'seeds-snacks', 'oils', 'essentials', 'herbs-spices']);

  // Corporate & Bulk belongs under Gifting
  const giftingItem = MAIN_NAV_ITEMS.find((item) => item.id === 'gifting');
  assert.ok(giftingItem, 'Gifting item must exist');
  const corporateUnderGifting = giftingItem.dropdownItems?.find(
    (sub) => sub.id === 'corporate-bulk' || sub.path === '/wholesale'
  );
  assert.ok(corporateUnderGifting, 'Corporate & Bulk Gifting must be located under Gifting');
  assert.equal(corporateUnderGifting.path, '/wholesale');
});

test('2. Desktop BubbleMenu renders disclosure buttons with aria-expanded/aria-controls and destination anchors', () => {
  const html = render(<BubbleMenu activeItem="Shop" />);

  // Main row items with dropdowns must be disclosure buttons with aria-haspopup, aria-expanded, aria-controls
  for (const item of MAIN_NAV_ITEMS) {
    if (item.hasDropdown) {
      assert.ok(
        html.includes(`id="nav-trigger-${item.id}"`),
        `Trigger button for ${item.id} must have expected ID`
      );
      assert.ok(
        html.includes(`aria-controls="nav-dropdown-panel-${item.id}"`),
        `Trigger button for ${item.id} must reference its dropdown panel`
      );
      assert.ok(
        html.includes(`aria-haspopup="true"`),
        `Trigger button must declare aria-haspopup="true"`
      );
    }
  }

  // Compact food row items must be rendered as navigation destinations
  for (const food of COMPACT_FOOD_NAV_ITEMS) {
    assert.ok(
      html.includes(`data-nav-path="${food.path}"`),
      `Compact food row must render link for ${food.id} with path ${food.path}`
    );
  }
});

test('3. MobileMenu renders an accessible accordion with anchors for destinations and buttons for disclosure/actions', () => {
  const html = render(<MobileMenu isOpen onClose={() => {}} />);

  // Each main item must have an accordion disclosure button with aria-expanded and aria-controls
  for (const item of MAIN_NAV_ITEMS) {
    assert.ok(
      html.includes(`aria-controls="mobile-nav-panel-${item.id}"`),
      `Mobile accordion header for ${item.id} must reference panel`
    );
    assert.ok(
      html.includes(`id="mobile-nav-panel-${item.id}"`),
      `Mobile panel for ${item.id} must exist in the document`
    );
  }

  // Navigation destinations must be rendered as semantic anchors (<a ... data-nav-path="...">)
  assert.match(
    html,
    /<a[^>]*data-nav-path="\/wholesale"[^>]*>/,
    'Corporate & Bulk under Gifting must be rendered as a semantic link anchor'
  );

  // Compact Food Categories section must be present in mobile drawer as semantic anchors
  for (const food of COMPACT_FOOD_NAV_ITEMS) {
    assert.match(
      html,
      new RegExp(`<a[^>]*data-nav-path="${food.path}"[^>]*>`),
      `Mobile menu must render semantic link anchor for ${food.id} with path ${food.path}`
    );
  }
});

test('4. Dark mode styling and Urdu/Arabic RTL layout support', () => {
  for (const language of ['en', 'ur', 'ar'] as const) {
    const desktop = render(<BubbleMenu />, language);
    const mobile = render(<MobileMenu isOpen onClose={() => {}} />, language);

    // Dark mode classes must be present
    assert.ok(desktop.includes('dark:bg-'), 'Desktop menu must include dark mode background classes');
    assert.ok(desktop.includes('dark:text-'), 'Desktop menu must include dark mode text classes');
    assert.ok(mobile.includes('dark:bg-'), 'Mobile menu must include dark mode background classes');

    // RTL direction attribute for Urdu and Arabic
    if (language === 'ur' || language === 'ar') {
      assert.ok(desktop.includes('dir="rtl"'), `Desktop menu must have dir="rtl" for ${language}`);
    } else {
      assert.ok(desktop.includes('dir="ltr"'), 'Desktop menu must have dir="ltr" for English');
    }
  }
});

test('5. Navigation destinations resolve meaningfully and preserve existing taxonomy aliases', () => {
  // Canonical category and aliases resolution
  assert.equal(resolveCategorySlug('celebration-boxes'), 'celebration-boxes');
  assert.equal(resolveCategorySlug('bid-boxes'), 'celebration-boxes');
  assert.equal(resolveCategorySlug('celebration-box'), 'celebration-boxes');
  assert.equal(resolveCategorySlug('combos'), 'gift-boxes');
  assert.equal(resolveCategorySlug('deals'), 'gift-boxes');
  assert.equal(resolveCategorySlug('dry-fruits'), 'dry-fruits');
  assert.equal(resolveCategorySlug('fruits'), 'nuts');
  assert.equal(resolveCategorySlug('dates'), 'dates');
  assert.equal(resolveCategorySlug('seeds-snacks'), 'seeds-snacks');
  assert.equal(resolveCategorySlug('oils'), 'oils');
  assert.equal(resolveCategorySlug('essentials'), 'essentials');
  assert.equal(resolveCategorySlug('herbs-spices'), 'herbs-spices');

  // Verify all dropdown sub-item paths are valid and non-empty
  for (const item of MAIN_NAV_ITEMS) {
    assert.ok(item.path.startsWith('/'), `Path for ${item.id} must be absolute`);
    if (item.dropdownItems) {
      for (const drop of item.dropdownItems) {
        assert.ok(
          drop.path.startsWith('/'),
          `Sub-item path for ${drop.id} in ${item.id} must be absolute`
        );
      }
    }
  }
});

test('6. Category matching function maps navigation targets to catalog products without empty results', async () => {
  const { PRODUCTS } = await import('../src/data/products');
  const { productMatchesCategory } = await import('../src/config/categories');

  // Dry fruits matches all 22 products with category 'nuts'
  const dryFruitsMatches = PRODUCTS.filter((p) => productMatchesCategory(p, 'dry-fruits'));
  assert.equal(dryFruitsMatches.length, 22, 'dry-fruits must match all 22 nuts/dry-fruit products');

  // Seeds and snacks matches all 13 products with category 'snacks-seeds'
  const seedsSnacksMatches = PRODUCTS.filter((p) => productMatchesCategory(p, 'seeds-snacks'));
  assert.equal(seedsSnacksMatches.length, 13, 'seeds-snacks must match all 13 snacks-seeds products');

  // Celebration boxes matches all 8 Bid Box products
  const celebrationMatches = PRODUCTS.filter((p) => productMatchesCategory(p, 'celebration-boxes'));
  assert.equal(celebrationMatches.length, 8, 'celebration-boxes must match all 8 celebration products');

  // Dates matches the 5 date products
  const dateMatches = PRODUCTS.filter((p) => productMatchesCategory(p, 'dates'));
  assert.equal(dateMatches.length, 5, 'dates must match the 5 date products');
  const dateIds = dateMatches.map((p) => p.id);
  assert.ok(dateIds.includes('ajwa-dates'));
  assert.ok(dateIds.includes('medjool-dates'));
  assert.ok(dateIds.includes('khajoor'));
});

test('7. Occasion matching filters products by approved occasion metadata', async () => {
  const { PRODUCTS } = await import('../src/data/products');
  const { productMatchesOccasion, productMatchesCategory } = await import('../src/config/categories');

  // Wedding celebration boxes: exactly 6
  const weddingBoxes = PRODUCTS.filter(
    (p) => productMatchesCategory(p, 'celebration-boxes') && productMatchesOccasion(p, 'wedding')
  );
  assert.equal(weddingBoxes.length, 6, 'Wedding occasion must return 6 wedding celebration boxes');
  assert.ok(weddingBoxes.some((p) => p.id === 'bid-box-card-nikkah'));
  assert.ok(weddingBoxes.every((p) => p.id !== 'bid-box-umrah-tabarruk'));
  assert.ok(weddingBoxes.every((p) => p.id !== 'bid-box-birth-announcement'));

  // Umrah celebration boxes: exactly 1
  const umrahBoxes = PRODUCTS.filter(
    (p) => productMatchesCategory(p, 'celebration-boxes') && productMatchesOccasion(p, 'umrah')
  );
  assert.equal(umrahBoxes.length, 1, 'Umrah occasion must return 1 Umrah tabarruk box');
  assert.equal(umrahBoxes[0].id, 'bid-box-umrah-tabarruk');

  // Birth celebration boxes: exactly 1
  const birthBoxes = PRODUCTS.filter(
    (p) => productMatchesCategory(p, 'celebration-boxes') && productMatchesOccasion(p, 'birth')
  );
  assert.equal(birthBoxes.length, 1, 'Birth occasion must return 1 Birth announcement box');
  assert.equal(birthBoxes[0].id, 'bid-box-birth-announcement');
});
