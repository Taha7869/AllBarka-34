import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CURRENCIES,
  CURRENCY_CODES,
  getExchangeRates,
  convertPkrToForeign,
  formatCurrencyPrice,
  getCurrencyDisclaimer,
} from '../src/lib/currency';

test('Feature C: Currency metadata and default static exchange rates', () => {
  assert.deepEqual(CURRENCY_CODES, ['PKR', 'GBP', 'USD', 'AED']);

  const rates = getExchangeRates();
  assert.equal(rates.PKR, 1.0);
  assert.equal(rates.USD, 280.0);
  assert.equal(rates.GBP, 355.0);
  assert.equal(rates.AED, 76.5);

  for (const code of CURRENCY_CODES) {
    assert.ok(CURRENCIES[code], `Metadata for ${code} must exist`);
    assert.ok(rates[code] > 0, `Exchange rate for ${code} must be strictly positive`);
  }
});

test('Feature C: Mathematical accuracy and boundary conditions for PKR conversion', () => {
  // 1. Exact division tests
  assert.equal(convertPkrToForeign(5600, 'USD'), 20.0);
  assert.equal(convertPkrToForeign(7100, 'GBP'), 20.0);
  assert.equal(convertPkrToForeign(1530, 'AED'), 20.0);
  assert.equal(convertPkrToForeign(5000, 'PKR'), 5000);

  // 2. Fractional rounding tests (2 decimal places)
  // 1000 PKR / 280 = 3.5714... -> 3.57 USD
  assert.equal(convertPkrToForeign(1000, 'USD'), 3.57);
  // 1000 PKR / 355 = 2.8169... -> 2.82 GBP
  assert.equal(convertPkrToForeign(1000, 'GBP'), 2.82);
  // 1000 PKR / 76.5 = 13.0718... -> 13.07 AED
  assert.equal(convertPkrToForeign(1000, 'AED'), 13.07);

  // 3. Edge and error cases
  assert.equal(convertPkrToForeign(0, 'USD'), 0);
  assert.equal(convertPkrToForeign(-500, 'USD'), 0);
  assert.equal(convertPkrToForeign(NaN, 'USD'), 0);
});

test('Feature C: Display approximation symbol "≈" for foreign currencies, omitted for PKR', () => {
  // PKR base display must NEVER contain the approximation symbol
  const pkrFormatted = formatCurrencyPrice(5000, 'PKR');
  assert.equal(pkrFormatted, 'Rs. 5,000');
  assert.ok(!pkrFormatted.includes('≈'), 'PKR price must not contain approximation symbol');

  // Foreign currencies MUST contain the approximation symbol "≈"
  const usdFormatted = formatCurrencyPrice(5600, 'USD');
  assert.ok(usdFormatted.startsWith('≈ $'), `USD format must start with '≈ $', got: ${usdFormatted}`);
  assert.ok(usdFormatted.includes('20.00'));

  const gbpFormatted = formatCurrencyPrice(7100, 'GBP');
  assert.ok(gbpFormatted.startsWith('≈ £'), `GBP format must start with '≈ £', got: ${gbpFormatted}`);
  assert.ok(gbpFormatted.includes('20.00'));

  const aedFormatted = formatCurrencyPrice(1530, 'AED');
  assert.ok(aedFormatted.startsWith('≈ AED'), `AED format must start with '≈ AED', got: ${aedFormatted}`);
  assert.ok(aedFormatted.includes('20.00'));
});

test('Feature C: Localized disclaimers reinforce strict PKR payment boundary', () => {
  const enDisclaimer = getCurrencyDisclaimer('en');
  assert.ok(enDisclaimer.includes('PKR') || enDisclaimer.includes('Pakistani Rupees'));

  const urDisclaimer = getCurrencyDisclaimer('ur');
  assert.ok(urDisclaimer.includes('PKR') || urDisclaimer.includes('پاکستانی روپے'));

  const arDisclaimer = getCurrencyDisclaimer('ar');
  assert.ok(arDisclaimer.includes('PKR') || arDisclaimer.includes('بالروبية الباكستانية'));
});
