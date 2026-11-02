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
