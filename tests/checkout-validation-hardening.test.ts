import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeAndValidatePkPhone,
  validateCustomerDetails,
  ValidationError,
} from '../src/lib/orderValidation';
import { validateShippingCity } from '../src/lib/shippingPolicy';

test('normalizeAndValidatePkPhone: strictly accepts valid Pakistani mobile numbers', () => {
  // 11 digits starting with 03
  const valid1 = normalizeAndValidatePkPhone('03160666083');
  assert.equal(valid1.valid, true);
  assert.equal(valid1.normalized, '03160666083');

  // +92 format
  const valid2 = normalizeAndValidatePkPhone('+923160666083');
  assert.equal(valid2.valid, true);
  assert.equal(valid2.normalized, '03160666083');

  // Spaces and hyphens
  const valid3 = normalizeAndValidatePkPhone('0300 1234567');
  assert.equal(valid3.valid, true);
  assert.equal(valid3.normalized, '03001234567');

  const valid4 = normalizeAndValidatePkPhone('+92-300-1234567');
  assert.equal(valid4.valid, true);
  assert.equal(valid4.normalized, '03001234567');

  // Leading 0092
  const valid5 = normalizeAndValidatePkPhone('00923001234567');
  assert.equal(valid5.valid, true);
  assert.equal(valid5.normalized, '03001234567');
});

test('normalizeAndValidatePkPhone: strictly rejects invalid formats, non-mobile prefixes, and non-Pakistani numbers', () => {
  // Too short / missing
  assert.equal(normalizeAndValidatePkPhone('').valid, false);
  assert.equal(normalizeAndValidatePkPhone('123').valid, false);
  assert.equal(normalizeAndValidatePkPhone('030012345').valid, false);

  // Too long
  assert.equal(normalizeAndValidatePkPhone('0300123456789').valid, false);

  // Pakistani landlines (042 Lahore, 021 Karachi) are rejected for mobile SMS/WhatsApp dispatch
  assert.equal(normalizeAndValidatePkPhone('04235889900').valid, false);
  assert.equal(normalizeAndValidatePkPhone('02134567890').valid, false);

  // International numbers
  assert.equal(normalizeAndValidatePkPhone('+447123456789').valid, false);
  assert.equal(normalizeAndValidatePkPhone('+14155552671').valid, false);
});

test('validateCustomerDetails: enforces minimum 10 characters for delivery address', () => {
  const baseCustomer = {
    name: 'Taha Ahmed',
    phone: '03160666083',
    city: 'Lahore',
    paymentMethod: 'cod',
  };

  // Less than 10 characters should fail
  for (const shortAddress of ['DHA', 'House 1', 'Main Rd', '123456789']) {
    assert.throws(
      () => validateCustomerDetails({ ...baseCustomer, address: shortAddress }),
      (err: any) => err instanceof ValidationError && err.code === 'INVALID_ADDRESS'
    );
  }

  // 10 characters or more should succeed
  const validAddress10 = 'House 1234'; // 10 chars
  const res = validateCustomerDetails({ ...baseCustomer, address: validAddress10 });
  assert.equal(res.address, validAddress10);

  const fullAddress = 'House 12, Street 4, Sector F, DHA Phase 6';
  const res2 = validateCustomerDetails({ ...baseCustomer, address: fullAddress });
  assert.equal(res2.address, fullAddress);
});

test('validateShippingCity: enforces canonical city names and rejects invalid/numeric inputs', () => {
  // Valid cities
  for (const validCity of ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Quetta', 'Sialkot', 'Gujranwala', 'Hyderabad', 'لاہور', 'کراچی']) {
    assert.equal(validateShippingCity(validCity), validCity);
  }

  // Placeholder destinations without specific city are rejected
  for (const placeholder of ['Other City', 'Nationwide', 'Outside Lahore', 'Select City', 'Choose City']) {
    assert.throws(
      () => validateShippingCity(placeholder),
      (err: any) => err instanceof ValidationError && err.code === 'INVALID_CITY'
    );
  }

  // Empty, too short, or non-alphabetical
  for (const invalid of ['', ' ', 'a', '12345', '---', '!@#$%^']) {
    assert.throws(
      () => validateShippingCity(invalid),
      (err: any) => err instanceof ValidationError && err.code === 'INVALID_CITY'
    );
  }
});
