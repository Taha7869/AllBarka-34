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
import { PRODUCTS, BID_BOX_PRODUCTS } from '../src/data/products';
import { LanguageProvider, type LanguageCode } from '../src/contexts/LanguageContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { CartProvider } from '../src/contexts/CartContext';
import { CatalogProvider } from '../src/contexts/CatalogContext';
import { ProductMediaProvider } from '../src/contexts/ProductMediaContext';
import { resolveBidBoxConfig } from '../src/lib/bidBoxPricing';
import { calculatePackagingMoq } from '../src/lib/packagingMoq';
import {
  getPackagingSubcategory,
  productMatchesPackagingSubcategory,
  resolveCelebrationCardVariant,
} from '../src/lib/packagingClassification';
import { destinationTranslations } from '../src/contexts/destinationTranslations';
import type { Product } from '../src/types';

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

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION 1: Single Selected-Variant Resolver for Highlight, Display & Cart
// ─────────────────────────────────────────────────────────────────────────────
test('Regression 1: resolveCelebrationCardVariant unifies highlight, price, MOQ, and cart payload', () => {
  const tinProduct = BID_BOX_PRODUCTS.find(p => p.id === 'bid-box-luxury-tin')!;
  assert.ok(tinProduct, 'bid-box-luxury-tin must exist');

  // Untouched default selection (requestedTierIndex = undefined)
  const defaultVariant = resolveCelebrationCardVariant(tinProduct, 'empty', undefined);
  assert.equal(defaultVariant.selectedTierIndex, 0, 'Untouched default tier index must be 0');
  assert.equal(defaultVariant.variantKey, 'Empty Pack (10 pcs)', 'Variant key at index 0');
  assert.equal(defaultVariant.unitPrice, 140, 'Unit price at index 0 must be 140');
  assert.equal(defaultVariant.packPrice, 1400, 'Pack price at index 0 must be 1400 (10 * 140)');
  assert.equal(defaultVariant.piecesPerPack, 10, 'Pieces at index 0 must be 10');
  assert.equal(defaultVariant.moq, calculatePackagingMoq(tinProduct, defaultVariant.variantKey), 'MOQ matches engine');
  assert.equal(defaultVariant.isDirectCheckoutEligible, true, 'Direct checkout eligible for priced empty tier');

  // Explicit tier selection (e.g. index 2: 50 pcs)
  const tier2Variant = resolveCelebrationCardVariant(tinProduct, 'empty', 2);
  assert.equal(tier2Variant.selectedTierIndex, 2, 'Selected tier index must be 2');
  assert.equal(tier2Variant.variantKey, 'Empty Bulk (50 pcs)', 'Variant key at index 2');
  assert.equal(tier2Variant.unitPrice, 125, 'Unit price at index 2 must be 125');
  assert.equal(tier2Variant.packPrice, 6250, 'Pack price at index 2 must be 6250 (50 * 125)');
  assert.equal(tier2Variant.piecesPerPack, 50, 'Pieces at index 2 must be 50');
  assert.equal(tier2Variant.moq, calculatePackagingMoq(tinProduct, tier2Variant.variantKey), 'MOQ matches engine');

  // Explicit mode switch to filled
  const filledVariant = resolveCelebrationCardVariant(tinProduct, 'filled', 0);
  assert.equal(filledVariant.activeMode, 'filled', 'Active mode must be filled');
  assert.equal(filledVariant.selectedTierIndex, 0, 'Filled option index 0');
  assert.equal(filledVariant.variantKey, 'Filled Standard (Assorted Dry Fruits)', 'Filled option 0 variant key');
  assert.equal(filledVariant.unitPrice, 1150, 'Filled option unit price must be 1150');
  assert.equal(filledVariant.packPrice, 1150, 'Filled option pack price must be 1150');
  assert.equal(filledVariant.piecesPerPack, 1, 'Pieces per pack is 1 for filled option');
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION 2: Remove Fabricated Prices and Honor Quote-Only / Inquiries
// ─────────────────────────────────────────────────────────────────────────────
test('Regression 2: Unpriced and quote-only products show Request Quote, no fabricated Rs.180/850', () => {
  const dummyQuoteOnlyProduct = {
    id: 'bid-box-custom-royal-chest',
    name_en: 'Custom Royal Chest',
    name_ur: 'شاہی کسٹم صندوق',
    name_ar: 'صندوق ملكي مخصص',
    category: 'celebration-boxes',
    packagingSubcategory: 'tin',
    isBidBox: true,
    quoteOnly: true,
    orderMode: 'inquiry_quote',
    prices: {},
    variants: [],
  } as unknown as Product;

  const resolved = resolveCelebrationCardVariant(dummyQuoteOnlyProduct, 'empty');
  assert.equal(resolved.isQuoteOnly, true, 'Product must be flagged quoteOnly');
  assert.equal(resolved.isDirectCheckoutEligible, false, 'Direct checkout must be false');
  assert.equal(resolved.unitPrice, null, 'Unit price must be null (NEVER fabricated 180 or 850)');
  assert.equal(resolved.packPrice, null, 'Pack price must be null');

  // Ensure unknown fillings do not fabricate 'Irani & Panjgur Dates with Roasted Nuts'
  assert.notEqual(
    resolved.fillingsDescription,
    'Irani & Panjgur Dates with Roasted Nuts',
    'Must never return stale fake filling fallback'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION 3: URL-Driven Filtering and Navigation Preservation
// ─────────────────────────────────────────────────────────────────────────────
test('Regression 3: Celebration and Occasions consume URL parameters and preserve category', () => {
  // Test Celebration with subcategory parameter
  const tabarrukHtml = renderApp('/shop/celebration-boxes?subcat=tabarruk');
  assert.ok(tabarrukHtml.includes('Umrah &amp; Hajj Tabarruk Box Set') || tabarrukHtml.includes('Umrah & Hajj Tabarruk Box Set'), 'Tabarruk box must be present under ?subcat=tabarruk');
  assert.equal(tabarrukHtml.includes('Classic Card Bid Box'), false, 'Nikkah card box must not appear under ?subcat=tabarruk');

  // Test Celebration with subcat=tin
  const tinHtml = renderApp('/shop/celebration-boxes?subcat=tin');
  assert.ok(tinHtml.includes('Luxury Floral Tin Bid Box'), 'Luxury Floral Tin must appear under ?subcat=tin');
  assert.equal(tinHtml.includes('Royal Pyramid Favor Box'), false, 'Pyramid box must not appear under ?subcat=tin');

  // Test Celebration with subcat=wedding
  const weddingHtml = renderApp('/shop/celebration-boxes?subcat=wedding');
  assert.ok(weddingHtml.includes('Classic Card Bid Box'), 'Classic Card must appear');
  assert.ok(weddingHtml.includes('Royal Pyramid Favor Box'), 'Pyramid favor must appear');
  assert.ok(weddingHtml.includes('Artisanal Jute &amp; Jamawar Pouch') || weddingHtml.includes('Artisanal Jute & Jamawar Pouch'), 'Jute pouch must appear');
  assert.ok(weddingHtml.includes('Heritage Nikkah Sweet &amp; Dry Fruit Box') || weddingHtml.includes('Heritage Nikkah Sweet & Dry Fruit Box'), 'Sweet nikkah must appear');
  assert.equal(weddingHtml.includes('Umrah &amp; Hajj Tabarruk Box Set') || weddingHtml.includes('Umrah & Hajj Tabarruk Box Set'), false, 'Tabarruk must not appear under wedding');

  // Test Occasions with category parameter preservation: /occasions/wedding?category=dry-fruits
  const occCatHtml = renderApp('/occasions/wedding?category=dry-fruits');
  assert.ok(occCatHtml.includes('Nikkah &amp; Wedding') || occCatHtml.includes('Nikkah & Wedding'), 'Occasion wedding active');
  assert.ok(occCatHtml.includes('Whole Dry Fruits'), 'Category dry-fruits subfilter active');
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION 4: Admin-Editable Packaging Metadata & Unclassified Unknown Products
// ─────────────────────────────────────────────────────────────────────────────
test('Regression 4: Admin metadata is respected; unknown products return null (never default to wedding)', () => {
  // 1. Explicit product metadata
  const adminTinProduct: Partial<Product> = {
    id: 'admin-new-tin-2026',
    name_en: 'Admin Custom Keepsake Tin',
    packagingSubcategory: 'tin',
  };
  assert.equal(getPackagingSubcategory(adminTinProduct), 'tin', 'Admin product metadata takes precedence');
  assert.equal(productMatchesPackagingSubcategory(adminTinProduct, 'tin'), true, 'Matches tin subcategory');
  assert.equal(productMatchesPackagingSubcategory(adminTinProduct, 'wedding'), false, 'Does NOT match wedding');

  // 2. Explicit bidBoxConfig metadata
  const adminBabyBox: Partial<Product> = {
    id: 'admin-new-baby-box',
    name_en: 'Admin Baby Box',
    bidBoxConfig: {
      packagingSubcategory: 'baby',
    },
  };
  assert.equal(getPackagingSubcategory(adminBabyBox), 'baby', 'bidBoxConfig metadata takes precedence');

  // 3. Unknown product returns null, never 'wedding'
  const unknownProduct: Partial<Product> = {
    id: 'unknown-mystery-box-999',
    name_en: 'Mystery Gift Box',
  };
  assert.equal(getPackagingSubcategory(unknownProduct), null, 'Unknown product must return null (unclassified)');
  assert.equal(productMatchesPackagingSubcategory(unknownProduct, 'wedding'), false, 'Unknown product must NOT match wedding');
  assert.equal(productMatchesPackagingSubcategory(unknownProduct, 'all'), true, 'Matches all');
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION 5: Purge Unapproved Claims across EN, UR, and AR
// ─────────────────────────────────────────────────────────────────────────────
test('Regression 5: Unapproved claims purged (25% factory discount, 2 hours guarantee, engraving, unapproved lead times)', () => {
  for (const lang of ['en', 'ur', 'ar'] as const) {
    const t = destinationTranslations[lang];

    // No "up to 25% factory discount" or blanket discount promise
    assert.equal(
      t['dest.wholesale.packagingMoqCopy'].includes('25%'),
      false,
      `[${lang}] dest.wholesale.packagingMoqCopy must not claim up to 25% factory discount`
    );

    // No response time guarantee ("2 business hours" / "2 گھنٹے" / "ساعتين")
    assert.equal(
      t['dest.wholesale.inquiryNote'].includes('2 business hours') ||
        t['dest.wholesale.inquiryNote'].includes('2 گھنٹے') ||
        t['dest.wholesale.inquiryNote'].includes('ساعتين'),
      false,
      `[${lang}] dest.wholesale.inquiryNote must not promise response within 2 hours`
    );

    // No engraving promises in wholesale description
    assert.equal(
      t['dest.wholesale.description'].includes('engraving'),
      false,
      `[${lang}] dest.wholesale.description must not promise custom brand engraving`
    );

    // Custom preparation lead time notice must state minimum 10 calendar days following final design approval and advance deposit
    if (lang === 'en') {
      assert.ok(
        t['dest.celebration.leadTimeNotice'].includes('following final design approval and any team-required advance deposit'),
        'EN lead time notice must state design approval and advance deposit condition'
      );
      assert.ok(
        t['dest.celebration.leadTimeNotice'].includes('Courier transit times') &&
          t['dest.celebration.leadTimeNotice'].includes('apply separately'),
        'EN lead time notice must state courier transit times apply separately'
      );
    } else if (lang === 'ur') {
      assert.ok(
        t['dest.celebration.leadTimeNotice'].includes('حتمی ڈیزائن کی منظوری اور درکار پیشگی ایڈوانس ڈپازٹ'),
        'UR lead time notice must state design approval and advance deposit condition'
      );
    } else if (lang === 'ar') {
      assert.ok(
        t['dest.celebration.leadTimeNotice'].includes('بعد الاعتماد النهائي للتصميم وسداد الدفعة المقدمة المطلوبة'),
        'AR lead time notice must state design approval and advance deposit condition'
      );
      // No free samples claim in AR
      assert.equal(
        t['dest.celebration.customQuoteBannerCopy'].includes('عينات مجانية'),
        false,
        'AR custom quote copy must not promise free samples'
      );
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION 6: Destination Page Rendering and Structure Integrity
// ─────────────────────────────────────────────────────────────────────────────
test('Regression 6: Dedicated destinations render proper headers, policies, and product cards', () => {
  // Celebration Boxes
  const htmlCelebration = renderApp('/shop/celebration-boxes');
  assert.ok(htmlCelebration.includes('Celebration &amp; Bid Boxes') || htmlCelebration.includes('Celebration & Bid Boxes'));
  assert.ok(htmlCelebration.includes('Signature Tin Boxes'));
  assert.ok(htmlCelebration.includes('Hajj &amp; Umrah Tabarruk Sets') || htmlCelebration.includes('Hajj & Umrah Tabarruk Sets'));

  // Gifts & Hampers
  const htmlGifting = renderApp('/gifting');
  assert.ok(htmlGifting.includes('Luxury Gifts &amp; Curated Hampers') || htmlGifting.includes('Luxury Gifts & Curated Hampers'));
  assert.ok(htmlGifting.includes('Bespoke Hamper Builder'));
  assert.ok(htmlGifting.includes('Corporate Executive Gifting'));

  // Deals & Value Packages
  const htmlDeals = renderApp('/shop/deals');
  assert.ok(htmlDeals.includes('Value Packages &amp; Curated Deals') || htmlDeals.includes('Value Packages & Curated Deals'));
  assert.ok(htmlDeals.includes('Verified Pricing Integrity'));

  // Wholesale
  const htmlWholesale = renderApp('/wholesale');
  assert.ok(htmlWholesale.includes('Corporate &amp; Bulk Gifting') || htmlWholesale.includes('Corporate & Bulk Gifting'));
  assert.ok(htmlWholesale.includes('Food Exemption (MOQ = 1)'));
  assert.ok(htmlWholesale.includes('Packaging Volume Tiers'));
  assert.ok(htmlWholesale.includes('10-Day Preparation Lead Time'));

  // No duplicate homepage grids inside /shop PLP
  const htmlShop = renderApp('/shop');
  assert.equal(htmlShop.includes('id="bespoke-bid-boxes"'), false);
  assert.equal(htmlShop.includes('id="deals-value-packages"'), false);
});
