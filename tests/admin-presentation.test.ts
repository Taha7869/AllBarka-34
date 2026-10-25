import assert from 'node:assert/strict';
import test from 'node:test';
import { adminTranslations } from '../src/contexts/adminTranslations';
import { adminDisplayText, adminPhoneHref, adminTimestamp, createAdminCsv, csvCell, formatAdminCurrency, formatAdminDate } from '../src/lib/adminPresentation';

test('CSV cells guard formula inputs, whitespace disguises and international phones', () => {
  for (const input of ['=HYPERLINK("https://example.com")', '+923000000000', '-cmd', '@SUM(1,2)', '  =1+1', '\t+1', '\r\n@SUM(1,2)', '\uFEFF=1+1', '\u0000=1+1']) {
    assert.ok(csvCell(input).startsWith('"\''), input);
  }
  assert.equal(csvCell(-150), '"-150"');
  assert.equal(csvCell(150), '"150"');
  assert.equal(csvCell('AllBarka, "Lahore"'), '"AllBarka, ""Lahore"""');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(Infinity), '""');
});

test('CSV has a Unicode BOM, quoted multiline fields and stable CRLF record endings', () => {
  const result = createAdminCsv(['Customer', 'Note'], [['عائشہ', 'First line\nSecond line']]);
  assert.equal(result, '\uFEFF"Customer","Note"\r\n"عائشہ","First line\nSecond line"\r\n');
  assert.equal(createAdminCsv(['Order'], []), '\uFEFF"Order"\r\n');
});

test('safe display helpers never convert malformed values into zero, a date or a phone URL', () => {
  assert.equal(adminDisplayText('  Lahore  '), 'Lahore');
  assert.equal(adminDisplayText(0), '0');
  for (const value of [undefined, null, NaN, {}, []]) assert.equal(adminDisplayText(value), '—');
  assert.equal(formatAdminCurrency(0), 'Rs. 0');
  assert.equal(formatAdminCurrency('1500'), 'Rs. 1,500');
  for (const value of [undefined, null, '', 'not a total', '1,500', -1, NaN, Infinity]) assert.equal(formatAdminCurrency(value), '—');
  assert.equal(adminPhoneHref('+92 (316) 066-6083'), 'tel:+923160666083');
  assert.equal(adminPhoneHref('03160666083'), 'tel:03160666083');
  for (const value of ['javascript:alert(1)', 'https://example.com', '+92;ext=1', '123', '', null]) assert.equal(adminPhoneHref(value), null);
});

test('administrator dates use Pakistan time independently of the host timezone', () => {
  const instant = '2026-10-01T20:30:00.000Z';
  const timestamp = Date.parse(instant);
  assert.equal(adminTimestamp(instant), timestamp);
  assert.equal(adminTimestamp({ seconds: timestamp / 1000 }), timestamp);
  assert.equal(adminTimestamp({ _seconds: timestamp / 1000 }), timestamp);
  assert.match(formatAdminDate(instant), /02[- ]Oct[- ]2026/);
  assert.match(formatAdminDate(instant), /01:30/);
  for (const value of [undefined, null, '', 'not a date', '123', Infinity, { seconds: 'invalid' }]) {
    assert.equal(adminTimestamp(value), null);
    assert.equal(formatAdminDate(value), '—');
  }
  for (const language of ['ur', 'ar'] as const) assert.notEqual(formatAdminDate(instant, language), '—');
});

test('administrator translations provide the same complete keys and placeholders in all languages', () => {
  const englishKeys = Object.keys(adminTranslations.en).sort();
  assert.ok(englishKeys.length > 100);
  for (const language of ['ur', 'ar'] as const) {
    assert.deepEqual(Object.keys(adminTranslations[language]).sort(), englishKeys);
    for (const key of englishKeys) {
      assert.match(adminTranslations[language][key], /[\u0600-\u06ff]/u, key);
      assert.deepEqual(adminTranslations[language][key].match(/\{[^}]+\}/g)?.sort() || [], adminTranslations.en[key].match(/\{[^}]+\}/g)?.sort() || [], key);
    }
  }
});
