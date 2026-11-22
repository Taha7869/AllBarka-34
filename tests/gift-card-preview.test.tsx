import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import GiftMessageCardPreview from '../src/components/GiftMessageCardPreview';

test('GiftMessageCardPreview renders live gift text, recipient, style, ribbon, and char counter', () => {
  const html = renderToStaticMarkup(
    <LanguageProvider initialLanguage="en">
      <GiftMessageCardPreview
        recipientName="Ayesha & Tariq"
        message="Eid Mubarak with warm wishes!"
        cardStyle="eid"
        ribbon="emerald"
        maxLength={300}
      />
    </LanguageProvider>,
  );

  assert.match(html, /data-testid="gift-card-live-preview"/);
  assert.match(html, /data-card-style="eid"/);
  assert.match(html, /data-ribbon="emerald"/);
  assert.ok(html.includes('Ayesha &amp; Tariq'));
  assert.ok(html.includes('Eid Mubarak with warm wishes!'));
  assert.ok(html.includes('29 / 300'));
  assert.ok(html.includes('Eid Mubarak Card'));
  assert.ok(html.includes('Emerald ribbon'));
  assert.match(html, /data-testid="gift-spelling-warning"/);
  assert.match(html, /double-check spelling/i);
  assert.match(html, /cannot be edited after the order is placed/i);
});

test('GiftMessageCardPreview plain dua style omits festive sparkle icon and supports UR and AR RTL warnings', () => {
  const duaEn = renderToStaticMarkup(
    <LanguageProvider initialLanguage="en">
      <GiftMessageCardPreview message="May Allah grant speedy recovery." cardStyle="dua" ribbon="ivory" />
    </LanguageProvider>,
  );
  assert.match(duaEn, /data-card-style="dua"/);
  assert.ok(duaEn.includes('Plain Dua / Get-Well Card'));
  // Only the AlertCircle warning icon should be present as SVG (no festive Sparkles SVG inside header)
  assert.equal((duaEn.match(/<svg /g) || []).length, 1);

  const urHtml = renderToStaticMarkup(
    <LanguageProvider initialLanguage="ur">
      <GiftMessageCardPreview message="عید مبارک" cardStyle="celebration" ribbon="gold" />
    </LanguageProvider>,
  );
  assert.match(urHtml, /dir="rtl"/);
  assert.ok(urHtml.includes('گفٹ کارڈ کا براہِ راست پیش نظارہ'));
  assert.ok(urHtml.includes('عید مبارک'));
  assert.ok(urHtml.includes('آرڈر کے بعد پیغام میں تبدیلی ممکن نہیں'));

  const arHtml = renderToStaticMarkup(
    <LanguageProvider initialLanguage="ar">
      <GiftMessageCardPreview message="عيد مبارك" cardStyle="eid" ribbon="maroon" />
    </LanguageProvider>,
  );
  assert.match(arHtml, /dir="rtl"/);
  assert.ok(arHtml.includes('معاينة مباشرة لبطاقة الهدية'));
  assert.ok(arHtml.includes('عيد مبارك'));
  assert.ok(arHtml.includes('لا يمكن تعديل رسالة الهدية بعد تأكيد الطلب'));
});
