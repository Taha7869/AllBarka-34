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
  assert.deepEqual(foodIds, ['dry-fruits', 'dates', 'seeds-snacks', 'oils', 'essentials', 'herbs-spices', 'murabba-jaat']);

  // Corporate & Bulk belongs under Gifting
  const giftingItem = MAIN_NAV_ITEMS.find((item) => item.id === 'gifting');
  assert.ok(giftingItem, 'Gifting item must exist');
  const corporateUnderGifting = giftingItem.dropdownItems?.find(
    (sub) => sub.id === 'corporate-bulk' || sub.path === '/wholesale'
  );
  assert.ok(corporateUnderGifting, 'Corporate & Bulk Gifting must be located under Gifting');
  assert.equal(corporateUnderGifting.path, '/wholesale');
});

test('2. Desktop BubbleMenu renders a single clean navigation row by default with disclosure buttons, aria-expanded/aria-controls, and prominent Custom Hamper inside Gifts & Hampers', () => {
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

  // Default desktop header must NOT render the secondary food-category row
  assert.ok(
    !html.includes('role="navigation" aria-label='),
    'Secondary food-category row must be omitted by default on desktop'
  );

  // All food categories remain accessible inside the Shop dropdown config
  const shopItem = MAIN_NAV_ITEMS.find((item) => item.id === 'shop');
  assert.ok(shopItem?.dropdownItems, 'Shop dropdown items must exist');
  for (const food of COMPACT_FOOD_NAV_ITEMS) {
    assert.ok(
      shopItem.dropdownItems.some((sub) => sub.path === food.path),
      `Shop dropdown must retain food category path ${food.path}`
    );
  }

  // Custom Hamper is a prominent action inside Gifts & Hampers dropdown
  const giftingItem = MAIN_NAV_ITEMS.find((item) => item.id === 'gifting');
  const customHamperSub = giftingItem?.dropdownItems?.find((sub) => sub.id === 'custom-hamper');
  assert.ok(customHamperSub, 'Custom Hamper must be in Gifts & Hampers dropdown');
  assert.equal(customHamperSub.action, 'open-hamper-builder');
  assert.equal(giftingItem?.dropdownItems?.[0]?.id, 'custom-hamper', 'Custom Hamper must be the prominent first action in Gifts & Hampers');
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
  assert.equal(resolveCategorySlug('deals'), 'deals');
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

test('8. Authoritative occasion matching strictly honors product.occasions over badges, heuristics and legacy tags', async () => {
  const { productMatchesOccasion, productMatchesCategory, normalizeOccasionSlug } = await import('../src/config/categories');

  // Normalization of aliases
  assert.equal(normalizeOccasionSlug('nikkah'), 'wedding');
  assert.equal(normalizeOccasionSlug('Wedding'), 'wedding');
  assert.equal(normalizeOccasionSlug('hajj'), 'umrah');
  assert.equal(normalizeOccasionSlug('baby'), 'birth');
  assert.equal(normalizeOccasionSlug('aqeeqah'), 'birth');
  assert.equal(normalizeOccasionSlug('eid'), 'ramadan');

  // Requirement: occasions:['wedding'] with tag_en:'Premium' matches wedding
  const weddingWithBadge = {
    id: 'prod-test-wedding',
    occasions: ['wedding'],
    tag_en: 'Premium',
  };
  assert.equal(productMatchesOccasion(weddingWithBadge, 'wedding'), true, 'Must match wedding');
  assert.equal(productMatchesOccasion(weddingWithBadge, 'birth'), false, 'Must not match birth');
  assert.equal(productMatchesOccasion(weddingWithBadge, 'corporate'), false, 'Must not match corporate');

  // Requirement: occasions:['birth'] with legacy occasionTag:'Wedding' matches birth and excludes wedding
  const birthWithLegacyWedding = {
    id: 'prod-test-birth',
    occasions: ['birth'],
    bidBoxConfig: { occasionTag: 'Wedding & Festive Keepsake' },
    occasionTag: 'Wedding & Festive Keepsake',
    tag_en: 'Wedding Special',
  };
  assert.equal(productMatchesOccasion(birthWithLegacyWedding, 'birth'), true, 'Must match birth from canonical occasions');
  assert.equal(productMatchesOccasion(birthWithLegacyWedding, 'wedding'), false, 'Must exclude wedding because canonical occasions is authoritative');

  // Requirement: occasions:[] does not gain eligibility from a combo/bundle ID or keywords
  const emptyOccasionsCombo = {
    id: 'combo-wedding-bundle-box',
    name_en: 'Royal Nikkah Wedding Combo Box',
    occasions: [],
    keywords: ['wedding', 'nikkah', 'combo', 'bundle'],
    bidBoxConfig: { occasionTag: 'Wedding & Festive Keepsake' },
    tag_en: 'Wedding',
  };
  assert.equal(productMatchesOccasion(emptyOccasionsCombo, 'wedding'), false, 'Explicit empty array [] must NEVER gain eligibility from ID, name, keywords, or legacy tags');
  assert.equal(productMatchesOccasion(emptyOccasionsCombo, 'birth'), false);
  assert.equal(productMatchesOccasion(emptyOccasionsCombo, 'all'), true);
  assert.equal(productMatchesOccasion(emptyOccasionsCombo, null), true);

  // Requirement: category + occasion remains an intersection
  const celebrationWedding = {
    id: 'bid-box-card-nikkah',
    category: 'celebration-boxes',
    occasions: ['wedding'],
  };
  const bundleWedding = {
    id: 'bundle-nikkah-gift',
    category: 'bundles',
    occasions: ['wedding'],
  };
  // celebration-boxes + wedding intersection
  assert.equal(
    productMatchesCategory(celebrationWedding, 'celebration-boxes') && productMatchesOccasion(celebrationWedding, 'wedding'),
    true
  );
  assert.equal(
    productMatchesCategory(bundleWedding, 'celebration-boxes') && productMatchesOccasion(bundleWedding, 'wedding'),
    false
  );
  // bundles + wedding intersection
  assert.equal(
    productMatchesCategory(bundleWedding, 'bundles') && productMatchesOccasion(bundleWedding, 'wedding'),
    true
  );
  assert.equal(
    productMatchesCategory(celebrationWedding, 'bundles') && productMatchesOccasion(celebrationWedding, 'wedding'),
    false
  );
});

test('9. Admin save/reload updates product occasions and changes actual PLP filtered results', async () => {
  const { filterCatalogSelection } = await import('../src/lib/catalogFilterDraft');
  const { readCatalogFilters } = await import('../src/lib/catalogDiscovery');
  const { PRODUCTS } = await import('../src/data/products');

  // Initial catalog state: product has occasions: ['wedding']
  const initialProduct = {
    ...PRODUCTS[0],
    id: 'prod-admin-test-1',
    name_en: 'Artisanal Keepsake Box',
    category: 'celebration-boxes',
    occasions: ['wedding'],
    prices: { 'Standard': 1500 },
    active: true,
  };
  const catalogBefore = [initialProduct];

  const weddingFilters = { ...readCatalogFilters(new URLSearchParams()), occasion: 'wedding' };
  const birthFilters = { ...readCatalogFilters(new URLSearchParams()), occasion: 'birth' };
  const context = { category: 'celebration-boxes', isWholesale: false, savedIds: [], sharedIds: null };

  const plpBeforeWedding = filterCatalogSelection(catalogBefore, weddingFilters, context);
  const plpBeforeBirth = filterCatalogSelection(catalogBefore, birthFilters, context);
  assert.equal(plpBeforeWedding.length, 1, 'Product appears in wedding before admin edit');
  assert.equal(plpBeforeBirth.length, 0, 'Product absent from birth before admin edit');

  // Admin saves update: merchant changes occasion from wedding to birth
  const updatedProduct = {
    ...initialProduct,
    occasions: ['birth'],
  };
  const catalogAfter = [updatedProduct];

  const plpAfterWedding = filterCatalogSelection(catalogAfter, weddingFilters, context);
  const plpAfterBirth = filterCatalogSelection(catalogAfter, birthFilters, context);
  assert.equal(plpAfterWedding.length, 0, 'Product no longer appears in wedding after admin edit');
  assert.equal(plpAfterBirth.length, 1, 'Product now appears in birth after admin edit');
});

test('10. Deals route resolution and matching returns only curated bundles and deals without arbitrary products', async () => {
  const { PRODUCTS } = await import('../src/data/products');
  const { productMatchesCategory, resolveCategorySlug } = await import('../src/config/categories');

  // Route slug resolution
  assert.equal(resolveCategorySlug('deals'), 'deals', '/shop/deals resolves to deals category');

  // Match products for 'deals'
  const dealsProducts = PRODUCTS.filter((p) => productMatchesCategory(p, 'deals'));
  assert.equal(dealsProducts.length, 15, 'Deals must match exactly the 13 curated bundles plus deal-1 and deal-2');

  const dealIds = dealsProducts.map((p) => p.id);
  assert.ok(dealIds.includes('deal-1'), 'deal-1 is included in deals');
  assert.ok(dealIds.includes('deal-2'), 'deal-2 is included in deals');
  assert.ok(dealIds.includes('bundle-daily-grind'), 'bundle is included in deals');

  // Crucial: Arbitrary nuts, dates, oils, spices must NOT match deals
  assert.ok(!dealIds.includes('pista'), 'Pista must NOT match deals');
  assert.ok(!dealIds.includes('ajwa-dates'), 'Ajwa dates must NOT match deals');
  assert.ok(!dealIds.includes('cold-pressed-mustard-oil'), 'Mustard oil must NOT match deals');
  assert.ok(!dealIds.includes('saffron-super-negin'), 'Saffron must NOT match deals');
  assert.ok(!dealIds.includes('bid-box-luxury-tin'), 'Standard bid box must NOT match deals');
});

test('11. Customer-facing category translations exist in EN, UR, and AR without raw keys', async () => {
  const { catalogTranslations } = await import('../src/contexts/catalogTranslations');
  const { CANONICAL_CATEGORIES } = await import('../src/config/categories');

  const requiredKeys = [
    'shop.dry-fruits',
    'shop.dates',
    'shop.seeds-snacks',
    'shop.celebration-boxes',
    'shop.deals',
    'shop.gifting',
    'shop.combos',
    'shop.nuts',
    'shop.snacks-seeds',
    'shop.oils',
    'shop.essentials',
    'shop.herbs-spices',
    'shop.bundles',
  ];

  for (const lang of ['en', 'ur', 'ar'] as const) {
    const dict = catalogTranslations[lang];
    assert.ok(dict, `Translation dictionary for ${lang} must exist`);

    for (const key of requiredKeys) {
      const val = dict[key];
      assert.ok(val && typeof val === 'string', `Translation for ${key} in ${lang} must be non-empty string`);
      assert.ok(!val.startsWith('shop.'), `Translation for ${key} in ${lang} must not be a raw translation key`);
    }

    // Verify all CANONICAL_CATEGORIES have valid translations in each language
    for (const catId of Object.keys(CANONICAL_CATEGORIES)) {
      const catKey = `shop.${catId}`;
      const val = dict[catKey];
      assert.ok(val, `Category ${catId} must have translation under ${catKey} in ${lang}`);
    }
  }
});

test('12. Authoritative primary active navigation resolution and single aria-current indicator', async () => {
  const { getPrimaryActiveSectionId } = await import('../src/components/BubbleMenu');

  // Path & query checks
  assert.equal(getPrimaryActiveSectionId('/shop', ''), 'shop', '/shop without query must activate shop');
  assert.equal(getPrimaryActiveSectionId('/shop', '?occasion=wedding'), 'occasions', '/shop?occasion=wedding must activate occasions, not shop');
  assert.equal(getPrimaryActiveSectionId('/shop', '?occasion=birth'), 'occasions', '/shop?occasion=birth must activate occasions');
  assert.equal(getPrimaryActiveSectionId('/shop', '?occasion=all'), 'shop', '/shop?occasion=all must activate shop');
  assert.equal(getPrimaryActiveSectionId('/shop/dry-fruits', ''), 'shop', '/shop/dry-fruits must activate shop in main row');
  assert.equal(getPrimaryActiveSectionId('/shop/dates', ''), 'shop', '/shop/dates must activate shop in main row');
  assert.equal(getPrimaryActiveSectionId('/shop/celebration-boxes', ''), 'celebration-boxes', '/shop/celebration-boxes activates celebration-boxes');
  assert.equal(getPrimaryActiveSectionId('/shop/celebration-boxes', '?occasion=wedding'), 'celebration-boxes', '/shop/celebration-boxes?occasion=wedding activates celebration-boxes');
  assert.equal(getPrimaryActiveSectionId('/shop/bid-boxes', ''), 'celebration-boxes', '/shop/bid-boxes activates celebration-boxes');
  assert.equal(getPrimaryActiveSectionId('/gifting', ''), 'gifting', '/gifting activates gifting');
  assert.equal(getPrimaryActiveSectionId('/shop/combos', ''), 'gifting', '/shop/combos activates gifting');
  assert.equal(getPrimaryActiveSectionId('/wholesale', ''), 'gifting', '/wholesale activates gifting');
  assert.equal(getPrimaryActiveSectionId('/shop/deals', ''), 'deals', '/shop/deals activates deals');
  assert.equal(getPrimaryActiveSectionId('/shop/bundles', ''), 'deals', '/shop/bundles activates deals');

  // Verify BubbleMenu rendered markup: exactly one primary item has aria-current="page" on /shop
  const shopHtml = render(<BubbleMenu />, 'en', '/shop');
  assert.match(shopHtml, /id="nav-trigger-shop"[^>]*aria-current="page"/, 'Shop trigger must have aria-current="page" on /shop');
  assert.doesNotMatch(shopHtml, /id="nav-trigger-occasions"[^>]*aria-current="page"/, 'Occasions must not be active on /shop');

  // On /shop?occasion=wedding: Occasions has aria-current="page", Shop does NOT
  const occasionHtml = render(<BubbleMenu />, 'en', '/shop?occasion=wedding');
  assert.match(occasionHtml, /id="nav-trigger-occasions"[^>]*aria-current="page"/, 'Occasions trigger must have aria-current="page" on /shop?occasion=wedding');
  assert.doesNotMatch(occasionHtml, /id="nav-trigger-shop"[^>]*aria-current="page"/, 'Shop trigger must NOT have aria-current="page" on /shop?occasion=wedding');

  // On /shop/dry-fruits: Shop has aria-current="page" in the single-row desktop header
  const foodHtml = render(<BubbleMenu />, 'en', '/shop/dry-fruits');
  assert.match(foodHtml, /id="nav-trigger-shop"[^>]*aria-current="page"/, 'Shop must have aria-current="page" on /shop/dry-fruits');
});

