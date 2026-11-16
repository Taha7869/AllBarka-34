import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { catalogTranslations } from '../src/contexts/catalogTranslations';

test('bid boxes tell customers the price is a guide and the team confirms after the order', () => {
  for (const lang of ['en', 'ur', 'ar']) {
    assert.ok(catalogTranslations[lang]['bidBox.priceNotice.title']?.length > 10, lang);
    assert.ok(catalogTranslations[lang]['bidBox.priceNotice.body']?.length > 60, lang);
  }
  assert.match(catalogTranslations.en['bidBox.priceNotice.body'], /contact you to confirm the final price/);
  for (const file of ['src/components/BidBoxesSection.tsx', 'src/components/QuickViewModal.tsx', 'src/pages/ProductDetailPage.tsx']) {
    assert.match(fs.readFileSync(file, 'utf8'), /<IndicativePriceNotice/, file);
  }
});
