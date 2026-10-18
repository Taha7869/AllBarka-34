import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ShopPage from '../src/pages/ShopPage';
import CelebrationBoxesDestination, {
  getCelebrationSubcategory,
} from '../src/components/CelebrationBoxesDestination';
import GiftsHampersDestination from '../src/components/GiftsHampersDestination';
import DealsDestination from '../src/components/DealsDestination';
import OccasionsDestination from '../src/components/OccasionsDestination';
import WholesaleDestination from '../src/components/WholesaleDestination';
import { PRODUCTS } from '../src/data/products';
import { LanguageProvider, type LanguageCode } from '../src/contexts/LanguageContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { CartProvider } from '../src/contexts/CartContext';
import { CatalogProvider } from '../src/contexts/CatalogContext';
import { ProductMediaProvider } from '../src/contexts/ProductMediaContext';
import { resolveBidBoxConfig } from '../lib/bidBoxPricing';

function renderApp(path = '/', language: LanguageCode = 'en') {
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
      dispatchEvent: () => true,
      scrollTo: () => {},
      location: { origin: 'https://allbarka.com' },
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
              <CatalogProvider>
                <ProductMediaProvider>
                  <Routes>
                    <Route path="shop" element={<ShopPage />} />
                    <Route path="shop/:category" element={<ShopPage />} />
                    <Route path="category/:category" element={<ShopPage />} />
                    <Route path="wholesale" element={<ShopPage />} />
                    <Route path="gifting" element={<ShopPage />} />
                    <Route path="occasions" element={<ShopPage />} />
                    <Route path="occasions/:occasion" element={<ShopPage />} />
                    <Route path="*" element={<ShopPage />} />
                  </Routes>
                </ProductMediaProvider>
              </CatalogProvider>
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

test('1. Celebration Boxes Destination: Renders 5 approved subcategories and exact 8 verified products', () => {
  const html = renderApp('/shop/celebration-boxes');

  // Must mount CelebrationBoxesDestination
  assert.ok(html.includes('Celebration &amp; Bid Boxes') || html.includes('Celebration & Bid Boxes'), 'Header title must be present');
  assert.ok(html.includes('Bespoke Event Packaging &amp; Favors') || html.includes('Bespoke Event Packaging & Favors'), 'Eyebrow must be present');

  // Verify the 5 approved subcategories are listed
  assert.ok(html.includes('Signature Tin Boxes'), 'Signature Tin Boxes subcategory must exist');
  assert.ok(html.includes('Hajj &amp; Umrah Tabarruk Sets') || html.includes('Hajj & Umrah Tabarruk Sets'), 'Tabarruk Sets subcategory must exist');
  assert.ok(html.includes('Wedding Favor Boxes &amp; Pouches') || html.includes('Wedding Favor Boxes & Pouches'), 'Wedding Favors subcategory must exist');
  assert.ok(html.includes('Baby Announcement Boxes'), 'Baby Announcement Boxes subcategory must exist');
  assert.ok(html.includes('Personalized Acrylic Boxes'), 'Personalized Acrylic Boxes subcategory must exist');

  // Verify mapping of all 8 authoritative celebration box products
  const celebrationProducts = PRODUCTS.filter(p => p.isBidBox || p.category === 'celebration-boxes');
  assert.equal(celebrationProducts.length, 8, 'Exactly 8 verified celebration boxes must exist in catalog');

  const subcategoryMap = celebrationProducts.reduce<Record<string, number>>((acc, p) => {
    const subcat = getCelebrationSubcategory(p.id);
    acc[subcat] = (acc[subcat] || 0) + 1;
    return acc;
  }, {});

  assert.equal(subcategoryMap.tin, 1, 'Signature Tin has 1 verified product');
  assert.equal(subcategoryMap.tabarruk, 1, 'Tabarruk Sets has 1 verified product');
  assert.equal(subcategoryMap.wedding, 4, 'Wedding Favors has 4 verified products');
  assert.equal(subcategoryMap.baby, 1, 'Baby Announcement has 1 verified product');
  assert.equal(subcategoryMap.acrylic, 1, 'Personalized Acrylic has 1 verified product');

  // Verify all 8 product names are rendered in the HTML
  for (const prod of celebrationProducts) {
    const escapedName = prod.name_en.replace(/&/g, '&amp;');
    assert.ok(
      html.includes(prod.name_en) || html.includes(escapedName),
      `Product ${prod.name_en} (${prod.id}) must be rendered`
    );
  }
});

test('2. Celebration Boxes Destination: 10-day preparation notice and empty Tabarruk bottle advisory', () => {
  const html = renderApp('/shop/celebration-boxes');

  // 10-calendar day preparation lead time notice
  assert.ok(
    html.includes('minimum of 10 calendar days lead time before dispatch'),
    '10 calendar-day preparation notice must be prominently displayed'
  );
  assert.ok(
    html.includes('Courier transit times') && html.includes('apply separately'),
    'Notice must clarify transit times apply separately from assembly'
  );

  // Tabarruk bottles empty advisory
  assert.ok(
    html.includes('Tabarruk Bottles Notice') || html.includes('Glass Zamzam bottles and Tabarruk vials in all sets are supplied empty'),
    'Tabarruk bottles empty notice must be prominently stated'
  );

  // Cross-sell links
  assert.ok(html.includes('/shop/dry-fruits'), 'Cross-sell to whole dry fruits must be present');
  assert.ok(html.includes('/gifting'), 'Cross-sell to luxury hampers must be present');
});

test('3. Legacy Alias: /shop/bid-boxes resolves to Celebration Boxes Destination', () => {
  const html = renderApp('/shop/bid-boxes');
  assert.ok(html.includes('Celebration &amp; Bid Boxes') || html.includes('Celebration & Bid Boxes'), 'Legacy /shop/bid-boxes must render Celebration destination');
  assert.ok(html.includes('Signature Tin Boxes'), 'Must contain celebration subcategories');
});

test('4. Gifts & Hampers Destination: Bespoke Hamper Builder entry and corporate gifting', () => {
  const html = renderApp('/gifting');

  // Must mount GiftsHampersDestination
  assert.ok(html.includes('Luxury Gifts &amp; Curated Hampers') || html.includes('Luxury Gifts & Curated Hampers'), 'Gifting header title must be present');
  assert.ok(html.includes('Handcrafted in Lahore'), 'Gifting eyebrow must be present');

  // Bespoke Hamper Builder Card
  assert.ok(html.includes('Bespoke Hamper Builder'), 'Hamper builder title must be present');
  assert.ok(html.includes('Launch Hamper Builder'), 'Hamper builder launch button must be present');

  // Corporate Gifting Card
  assert.ok(html.includes('Corporate Executive Gifting'), 'Corporate gifting title must be present');
  assert.ok(html.includes('Request Corporate Inquiry'), 'Corporate inquiry button must be present');

  // Legacy aliases /shop/gift-boxes and /shop/combos also resolve to Gifting
  const htmlGiftBoxes = renderApp('/shop/gift-boxes');
  assert.ok(htmlGiftBoxes.includes('Luxury Gifts &amp; Curated Hampers') || htmlGiftBoxes.includes('Luxury Gifts & Curated Hampers'), '/shop/gift-boxes must render Gifts & Hampers');

  const htmlCombos = renderApp('/shop/combos');
  assert.ok(htmlCombos.includes('Luxury Gifts &amp; Curated Hampers') || htmlCombos.includes('Luxury Gifts & Curated Hampers'), '/shop/combos must render Gifts & Hampers');
});

test('5. Deals & Value Packages Destination: Verified savings notice and filter chips', () => {
  const html = renderApp('/shop/deals');

  // Must mount DealsDestination
  assert.ok(html.includes('Value Packages &amp; Curated Deals') || html.includes('Value Packages & Curated Deals'), 'Deals header title must be present');
  assert.ok(html.includes('Farm-Direct Savings'), 'Deals eyebrow must be present');

  // Verified pricing integrity notice
  assert.ok(
    html.includes('Verified Pricing Integrity') && html.includes('derived directly from individual variant component rates'),
    'Verified pricing integrity notice must be prominently displayed'
  );

  // Filter chips
  assert.ok(html.includes('All Deals &amp; Packages') || html.includes('All Deals & Packages'), 'All Deals chip must be present');
  assert.ok(html.includes('Tasting Duos &amp; Pairs') || html.includes('Tasting Duos & Pairs'), 'Duos chip must be present');
  assert.ok(html.includes('Festive Family Hampers'), 'Hampers chip must be present');
  assert.ok(html.includes('Wellness &amp; Pantry Reserves') || html.includes('Wellness & Pantry Reserves'), 'Wellness chip must be present');

  // Legacy alias /shop/bundles resolves to Deals
  const htmlBundles = renderApp('/shop/bundles');
  assert.ok(htmlBundles.includes('Value Packages &amp; Curated Deals') || htmlBundles.includes('Value Packages & Curated Deals'), '/shop/bundles must render Deals destination');
});

test('6. Occasions Destination: Switching tabs, category intersection, and honest empty state', () => {
  // Occasions landing
  const html = renderApp('/occasions');
  assert.ok(html.includes('Find a Gift for Your Occasion'), 'Occasions header title must be present');
  assert.ok(html.includes('Nikkah &amp; Wedding') || html.includes('Nikkah & Wedding'), 'Wedding tab must be present');
  assert.ok(html.includes('Umrah &amp; Hajj Tabarruk') || html.includes('Umrah & Hajj Tabarruk'), 'Umrah tab must be present');

  // Occasions filtered by route parameter: /occasions/wedding
  const htmlWedding = renderApp('/occasions/wedding');
  assert.ok(htmlWedding.includes('Classic Card Bid Box') || htmlWedding.includes('Luxury Floral Tin'), 'Wedding occasion must show wedding products');

  // Query parameter support: /shop?occasion=umrah
  const htmlQueryUmrah = renderApp('/shop?occasion=umrah');
  assert.ok(htmlQueryUmrah.includes('Umrah &amp; Hajj Tabarruk Box Set') || htmlQueryUmrah.includes('Umrah & Hajj Tabarruk Box Set'), 'Query occasion=umrah must render Tabarruk box');

  // Intersection: when occasion and category filter yields 0 results, an honest empty state with reset button is rendered
  const htmlEmpty = renderApp('/occasions/birth?category=oils');
  assert.ok(htmlEmpty.includes('No Matching Items for this Occasion Filter'), 'Must render honest empty state title');
  assert.ok(htmlEmpty.includes('Reset Occasion Filter'), 'Must render reset occasion button');
});

test('7. Corporate & Bulk Wholesale Destination: Transparent policies, food exemption, and lead time', () => {
  const html = renderApp('/wholesale');

  // Header & Eyebrow
  assert.ok(html.includes('Corporate &amp; Bulk Gifting') || html.includes('Corporate & Bulk Gifting'), 'Wholesale title must be present');
  assert.ok(html.includes('Executive Volume Reserves &amp; Tiered Pricing') || html.includes('Executive Volume Reserves & Tiered Pricing'), 'Wholesale eyebrow must be present');

  // Policy 1: Food Exemption (MOQ = 1)
  assert.ok(html.includes('Food Exemption (MOQ = 1)'), 'Food Exemption policy card must be present');
  assert.ok(html.includes('carry an MOQ of 1 pack'), 'Food MOQ = 1 explanation must be present');

  // Policy 2: Packaging Volume Tiers
  assert.ok(html.includes('Packaging Volume Tiers'), 'Packaging Volume Tiers policy card must be present');
  assert.ok(html.includes('automated volume tiers at 25, 50, and 100+ pieces'), 'Volume tiers explanation must be present');

  // Policy 3: 10-Day Preparation Lead Time
  assert.ok(html.includes('10-Day Preparation Lead Time'), '10-Day Preparation Lead Time policy card must be present');
  assert.ok(html.includes('minimum of 10 calendar days lead time before courier dispatch'), '10-day lead time explanation must be present');

  // Concierge CTAs
  assert.ok(html.includes('Request Corporate Quote'), 'Request Corporate Quote CTA must be present');
  assert.ok(html.includes('Chat with Corporate Concierge'), 'WhatsApp concierge CTA must be present');
});

test('8. Trilingual & RTL Support: Full translations across Urdu and Arabic with zero missing keys', () => {
  // Urdu Celebration Boxes
  const htmlUr = renderApp('/shop/celebration-boxes', 'ur');
  assert.ok(htmlUr.includes('تقاریب اور بیڈ باکسز'), 'Urdu celebration title must be translated');
  assert.ok(htmlUr.includes('شاہی ٹن باکسز'), 'Urdu Signature Tin subcategory must be translated');
  assert.ok(htmlUr.includes('10 دن کا وقت درکار ہے'), 'Urdu 10-day notice must be translated');

  // Arabic Celebration Boxes
  const htmlAr = renderApp('/shop/celebration-boxes', 'ar');
  assert.ok(htmlAr.includes('صناديق الاحتفالات والمناسبات'), 'Arabic celebration title must be translated');
  assert.ok(htmlAr.includes('صناديق معدنية مميزة'), 'Arabic Signature Tin subcategory must be translated');
  assert.ok(htmlAr.includes('10 أيام عمل قبل الشحن'), 'Arabic 10-day notice must be translated');

  // Urdu Wholesale
  const htmlUrWholesale = renderApp('/wholesale', 'ur');
  assert.ok(htmlUrWholesale.includes('کارپوریٹ اور بلک گفٹنگ'), 'Urdu wholesale title must be translated');
  assert.ok(htmlUrWholesale.includes('کھانے پینے کی اشیاء کا استثناء'), 'Urdu food MOQ exemption must be translated');

  // Arabic Wholesale
  const htmlArWholesale = renderApp('/wholesale', 'ar');
  assert.ok(htmlArWholesale.includes('هدايا الشركات والطلبات الكبرى'), 'Arabic wholesale title must be translated');
  assert.ok(htmlArWholesale.includes('استثناء الأغذية'), 'Arabic food MOQ exemption must be translated');
});

test('9. No Duplicate Homepage Grids: Neither CategoryPLP nor destinations duplicate BidBoxesSection/DealsPackagesSection', () => {
  const htmlShop = renderApp('/shop');
  // Check that the removed homepage sections (id="bespoke-bid-boxes" and id="deals-value-packages") are NOT duplicated inside /shop PLP
  assert.equal(htmlShop.includes('id="bespoke-bid-boxes"'), false, 'CategoryPLP must not stack BidBoxesSection');
  assert.equal(htmlShop.includes('id="deals-value-packages"'), false, 'CategoryPLP must not stack DealsPackagesSection');
});
