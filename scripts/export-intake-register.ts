import { writeFileSync } from 'node:fs';
import { intakeProducts20261110 } from '../src/lib/catalogIntake20261110';
import { intakeProducts20261113 } from '../src/lib/catalogIntake20261113';

// Offline, read-only: one row per draft product so none is left without a price, photo or decision.
const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const rows = [
  ['batch', 'id', 'name_en', 'category', 'collections', 'pack_options', 'reference_rate_per_base', 'base_unit', 'rate_status', 'image', 'photo_status', 'claims', 'status', 'owner_final_rate', 'owner_supplier', 'owner_publish_date'],
];
for (const [batch, list] of [['20261110', intakeProducts20261110()], ['20261113', intakeProducts20261113()]] as const) {
  for (const p of list as any[]) {
    const c = p.commerce;
    rows.push([batch, p.id, p.name_en, p.category, (p.collections || []).join('|'), c.options.map((o: any) => o.label).join('|'), c.basePrice, `${c.baseQuantity}${c.baseUnit}`,
      'reference only, owner to confirm', p.image, /placeholder/.test(p.image) ? 'placeholder' : 'illustration, real photo needed', p.claimsVerification?.status, p.status, '', '', ''] as any);
  }
}
writeFileSync('docs/catalog/MASTER_INTAKE_REGISTER.csv', rows.map(r => r.map(q).join(',')).join('\n') + '\n', 'utf8');
console.log(`Wrote ${rows.length - 1} rows`);
