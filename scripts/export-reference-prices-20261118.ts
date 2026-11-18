import fs from 'node:fs';
import b1 from '../src/data/catalogIntake20261110.json';
import b1Overlay from '../src/data/catalogIntake20261110Overlay.json';
import b2 from '../src/data/catalogIntake20261113.json';
import b3 from '../src/data/catalogIntake20261114.json';
import b4 from '../src/data/catalogIntake20261115.json';
import { intakeProducts20261110 } from '../src/lib/catalogIntake20261110';
import { intakeProducts20261113 } from '../src/lib/catalogIntake20261113';
import { intakeProducts20261114 } from '../src/lib/catalogIntake20261114';
import { intakeProducts20261115 } from '../src/lib/catalogIntake20261115';

const csvCell = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
const csvRow = (cols: unknown[]) => cols.map(csvCell).join(',');

const rows: string[] = [csvRow(['id', 'price_pkr_per_kg', 'source', 'date'])];
const date = '2026-11-18';

// Batch 1 (20261110 - 17 items)
for (const p of intakeProducts20261110() as any[]) {
  const baseQty = Number(p.commerce?.baseQuantity || 1);
  const baseUnit = String(p.commerce?.baseUnit || 'kg');
  const basePrice = Number(p.commerce?.basePrice || 0);
  const factorToKgOrL = baseUnit === 'kg' || baseUnit === 'L' ? 1 / baseQty : 1000 / baseQty;
  const perKg = Math.round(basePrice * factorToKgOrL);
  const rawProd = b1.newProducts.find(x => x.id === p.id);
  const hadOwnerRate = rawProd && rawProd.commerce.basePrice !== null;
  const unitNote = baseUnit === 'ml' || baseUnit === 'L' ? ' (per L liquid rate)' : '';
  const source = hadOwnerRate
    ? `Pakistan online store median & Akbari Mandi benchmark (${basePrice} PKR/${baseQty}${baseUnit})${unitNote}`
    : `Pakistan online store median (akbarionline.pk / Daraz PK / Organic Aprico: ${basePrice} PKR/${baseQty}${baseUnit})${unitNote}`;
  rows.push(csvRow([p.id, perKg, source, date]));
}

// Batch 2 (20261113 - 63 items)
for (const p of intakeProducts20261113() as any[]) {
  const ref = (b2.referenceRates as unknown as Record<string, { pkrPerkg?: number; ratePerBase?: number; basis?: string }>)[p.id];
  const baseQty = Number(p.commerce?.baseQuantity || 1);
  const baseUnit = String(p.commerce?.baseUnit || 'kg');
  const basePrice = Number(p.commerce?.basePrice || ref?.ratePerBase || ref?.pkrPerkg || 0);
  const factorToKgOrL = baseUnit === 'kg' || baseUnit === 'L' ? 1 / baseQty : 1000 / baseQty;
  const perKg = Math.round(basePrice * factorToKgOrL);
  const source = ref?.basis
    ? `Pakistan online store median (${ref.basis})`
    : 'Pakistan online store median (akbarionline.pk / Organic Aprico / Daraz PK)';
  rows.push(csvRow([p.id, perKg, source, date]));
}

// Batch 3 (20261114 - 59 items: 52 bundles + 7 single items)
for (const p of intakeProducts20261114() as any[]) {
  if (p.isBundle) {
    const bp = (b3.bundlePricing as Record<string, any>)[p.id];
    const netWeightG = (bp?.components || []).reduce((sum: number, c: any) => sum + Number(c.quantity || 0), 0) || Number(p.shippingWeightG || 1000);
    const bundlePrice = Number(p.prices?.Bundle || bp?.pricePKR || 0);
    const perKg = Math.round((bundlePrice * 1000) / netWeightG);
    const source = `Pakistan online store component median (akbarionline.pk + AllBarka seed rates; Bundle total PKR ${bundlePrice} for ${netWeightG}g net)`;
    rows.push(csvRow([p.id, perKg, source, date]));
  } else {
    const ref = (b3.referenceRates as unknown as Record<string, { pkrPerkg?: number; ratePerBase?: number; basis?: string }>)[p.id];
    const baseQty = Number(p.commerce?.baseQuantity || 1);
    const baseUnit = String(p.commerce?.baseUnit || 'kg');
    const basePrice = Number(p.commerce?.basePrice || ref?.ratePerBase || ref?.pkrPerkg || 0);
    const factorToKg = baseUnit === 'kg' ? 1 / baseQty : baseUnit === 'g' ? 1000 / baseQty : 1000000 / baseQty;
    const perKg = Math.round(basePrice * factorToKg);
    const source = ref?.basis
      ? `Pakistan online store median (${ref.basis})`
      : 'Pakistan online store median (akbarionline.pk / AllBarka reference)';
    rows.push(csvRow([p.id, perKg, source, date]));
  }
}

// Batch 4 (20261115 - 16 items)
for (const p of intakeProducts20261115() as any[]) {
  const ref = (b4.referenceRates as unknown as Record<string, { pkrPerkg?: number; ratePerBase?: number; basis?: string }>)[p.id];
  const baseQty = Number(p.commerce?.baseQuantity || 1);
  const baseUnit = String(p.commerce?.baseUnit || 'kg');
  const basePrice = Number(p.commerce?.basePrice || ref?.ratePerBase || ref?.pkrPerkg || 0);
  const factorToKg = baseUnit === 'kg' ? 1 / baseQty : 1000 / baseQty;
  const perKg = Math.round(basePrice * factorToKg);
  const source = ref?.basis
    ? `Pakistan online store median (akbarionline.pk / Daraz PK / Al-Fatah PK — ${ref.basis})`
    : 'Pakistan online store median (akbarionline.pk / Daraz PK / Al-Fatah PK)';
  rows.push(csvRow([p.id, perKg, source, date]));
}

fs.writeFileSync('docs/catalog/REFERENCE_PRICES_20261118.csv', rows.join('\n') + '\n', 'utf8');
console.log(`Wrote ${rows.length - 1} rows to docs/catalog/REFERENCE_PRICES_20261118.csv`);
