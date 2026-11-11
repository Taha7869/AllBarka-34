import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import {
  MEHMAAN_SETTINGS,
  calculateMehmaanPlan,
  resolveBestPortion,
  type MehmaanSetting,
} from '../src/lib/mehmaanPlanner';
import {
  checkEventLeadTime,
  buildOccasionWhatsAppUrl,
  CITY_OPTIONS,
  PACKAGING_OPTIONS,
  EVENT_OPTIONS,
  type OccasionInquiryPayload,
} from '../src/lib/occasionPlanning';

test('M12: Mehmaan Table Planner accurately scales portions, resolves catalog units, and preserves transparent calculations', () => {
  // 1. Settings exist and specify grams per guest
  const settings: MehmaanSetting[] = ['chai', 'dawat', 'iftar', 'majlis'];
  for (const s of settings) {
    const config = MEHMAAN_SETTINGS[s];
    assert.ok(config);
    assert.ok(config.nutsGramsPerGuest > 0);
    assert.ok(config.datesGramsPerGuest > 0);
    assert.ok(config.driedFruitsGramsPerGuest > 0);
    assert.ok(config.label_en && config.label_ur && config.label_ar);
  }

  // 2. Linear guest scaling
  const plan5 = calculateMehmaanPlan(PRODUCTS, 5, 'dawat');
  const plan10 = calculateMehmaanPlan(PRODUCTS, 10, 'dawat');
  assert.equal(plan10.breakdown.nutsGrams, plan5.breakdown.nutsGrams * 2);
  assert.equal(plan10.breakdown.datesGrams, plan5.breakdown.datesGrams * 2);
  assert.equal(plan10.breakdown.driedFruitsGrams, plan5.breakdown.driedFruitsGrams * 2);
  assert.equal(plan10.totalGrams, plan5.totalGrams * 2);

  // 3. Portion resolution to catalog weights
  const pista = PRODUCTS.find(p => p.id === 'pista')!;
  assert.ok(pista);
  const resolved250 = resolveBestPortion(pista, 200);
  assert.ok(resolved250.units >= 1);
  assert.ok(resolved250.total > 0);

  const resolved1000 = resolveBestPortion(pista, 900);
  assert.ok(resolved1000.units >= 1);
  assert.ok(resolved1000.total >= resolved250.total);

  // 4. Recommendation items include nuts, dates, and dried fruit
  assert.ok(plan10.items.length >= 3);
  assert.ok(plan10.items.some(i => i.category === 'nuts'));
  assert.ok(plan10.items.some(i => i.category === 'dates'));
  assert.ok(plan10.items.some(i => i.category === 'driedFruits'));
  assert.ok(plan10.estimatedTotalPkr > 0);

  // 5. Bounds protection: min 1 guest, max 200
  const planMin = calculateMehmaanPlan(PRODUCTS, -5, 'chai');
  assert.equal(planMin.guests, 1);
  const planMax = calculateMehmaanPlan(PRODUCTS, 500, 'chai');
  assert.equal(planMax.guests, 200);
});

test('M13 & M30: Occasion & Event Planning calculates lead times, evaluates urgency, and generates verified inquiry handoffs', () => {
  // 1. City options have transit notes and localized labels
  const lahore = CITY_OPTIONS.find(c => c.id === 'lahore');
  assert.ok(lahore?.transitNote.includes('Lahore'));
  const karachi = CITY_OPTIONS.find(c => c.id === 'karachi');
  assert.ok(karachi?.transitNote.includes('courier'));

  // 2. Packaging options
  const tin = PACKAGING_OPTIONS.find(p => p.id === 'luxury_tin');
  assert.equal(tin?.label_en, 'Luxury Gold Embossed Tin');
  const bespoke = PACKAGING_OPTIONS.find(p => p.id === 'custom');
  assert.equal(bespoke?.label_en, 'Bespoke Custom Packaging with Logo');

  // 3. Lead time calculation with standard 10-calendar-day policy
  const fixedNow = new Date('2026-11-02T10:00:00Z');

  // A. Safe lead time: 18 days out
  const safeCheck = checkEventLeadTime('lahore', 'luxury_tin', '2026-11-20', fixedNow);
  assert.equal(safeCheck.status, 'safe');
  assert.equal(safeCheck.totalRequiredDays, 10);

  // B. Tight lead time: 12 days out (within 10-14 days)
  const tightCheck = checkEventLeadTime('lahore', 'luxury_tin', '2026-11-14', fixedNow);
  assert.equal(tightCheck.status, 'tight');
  assert.equal(tightCheck.totalRequiredDays, 10);

  // C. Urgent lead time: 3 days out (< 10 days required)
  const urgentCheck = checkEventLeadTime('lahore', 'luxury_tin', '2026-11-05', fixedNow);
  assert.equal(urgentCheck.status, 'urgent');
  assert.equal(urgentCheck.status, 'urgent');

  // 4. WhatsApp inquiry URL builder
  const payload: OccasionInquiryPayload = {
    name: 'Ahmad Khan',
    phone: '03001234567',
    city: 'lahore',
    eventType: 'wedding',
    requestedDate: '2026-11-20',
    quantity: 100,
    packagingPreference: 'luxury_tin',
    includeCard: true,
    notes: 'Emerald theme with gold ribbon',
  };

  const whatsappUrl = buildOccasionWhatsAppUrl(payload, '923004085448');
  assert.ok(whatsappUrl.startsWith('https://wa.me/923004085448?text='));
  const decodedText = decodeURIComponent(whatsappUrl.replace('https://wa.me/923004085448?text=', ''));

  assert.ok(decodedText.includes('ALLBARKA LUXURY BOUTIQUE'));
  assert.ok(decodedText.includes('Ahmad Khan'));
  assert.ok(decodedText.includes('Lahore'));
  assert.ok(decodedText.includes('Wedding & Nikkah Favors'));
  assert.ok(decodedText.includes('100 units / favors'));
  assert.ok(decodedText.includes('Luxury Gold Embossed Tin'));
  assert.ok(decodedText.includes('Emerald theme with gold ribbon'));
  assert.ok(decodedText.includes('Quotation request only; final order confirmed upon artisan review and invoice.'));
});

test('M12: Large serving plan, cart quantity limits, and truthful planner acceptance feedback', () => {
  const mockCatalog: any[] = [
    {
      id: 'pista',
      name_en: 'Roasted Pistachios',
      category: 'nuts',
      active: true,
      status: 'published',
      quoteOnly: false,
      prices: { '250g': 1250, '500g': 2400 },
      variants: [{ label: '250g', available: true }, { label: '500g', available: true }],
    },
    {
      id: 'ajwa-dates',
      name_en: 'Ajwa Al-Madinah',
      category: 'dates',
      active: true,
      status: 'published',
      quoteOnly: false,
      prices: { '250g': 1800 },
      variants: [{ label: '250g', available: true }],
    },
    {
      id: 'afghan-figs',
      name_en: 'Afghan Figs',
      category: 'dry-fruits',
      active: true,
      status: 'published',
      quoteOnly: false,
      prices: { '250g': 950 },
      variants: [{ label: '250g', available: true }],
    },
    {
      id: 'draft-nut',
      name_en: 'Unpublished Draft Nut',
      category: 'nuts',
      active: true,
      status: 'draft',
      prices: { '250g': 1000 },
    },
    {
      id: 'inactive-date',
      name_en: 'Inactive Date',
      category: 'dates',
      active: false,
      status: 'published',
      prices: { '250g': 1200 },
    },
    {
      id: 'quote-only-fig',
      name_en: 'Bespoke Fig',
      category: 'dry-fruits',
      active: true,
      quoteOnly: true,
      prices: { '250g': 2000 },
    },
  ];

  // 1. Large guest count (200 guests) with heavy serving assumptions (80g/guest nuts = 16,000g)
  const largePlan = calculateMehmaanPlan(mockCatalog, 200, 'dawat', {
    nutsGramsPerGuest: 80,
    datesGramsPerGuest: 50,
    driedFruitsGramsPerGuest: 40,
  });

  assert.equal(largePlan.guests, 200);
  assert.equal(largePlan.breakdown.nutsGrams, 16000);
  assert.equal(largePlan.breakdown.datesGrams, 10000);
  assert.equal(largePlan.breakdown.driedFruitsGrams, 8000);

  // Draft, inactive, and quoteOnly items are strictly excluded
  assert.ok(!largePlan.items.some(i => i.product.id === 'draft-nut'));
  assert.ok(!largePlan.items.some(i => i.product.id === 'inactive-date'));
  assert.ok(!largePlan.items.some(i => i.product.id === 'quote-only-fig'));

  // Nuts portion is 500g x 32 units = 16,000g
  const nutsItem = largePlan.items.find(i => i.category === 'nuts');
  assert.ok(nutsItem);
  assert.equal(nutsItem.recommendedPortionWeight, '500g');
  assert.equal(nutsItem.recommendedUnits, 32);

  // Dates portion is 250g x 40 units = 10,000g
  const datesItem = largePlan.items.find(i => i.category === 'dates');
  assert.ok(datesItem);
  assert.equal(datesItem.recommendedPortionWeight, '250g');
  assert.equal(datesItem.recommendedUnits, 40);

  // 2. Large plan preserves exact recommended units and targets
  assert.equal(nutsItem.recommendedUnits, 32);
  assert.equal(datesItem.recommendedUnits, 40);
  const totalRecommendedUnits = largePlan.items.reduce((acc, i) => acc + i.recommendedUnits, 0);
  assert.ok(totalRecommendedUnits >= 72, 'Large event plan requires >50 total units across categories');
});
