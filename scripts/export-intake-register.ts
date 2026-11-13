import { writeFileSync } from 'node:fs';
import { intakeProducts20261110 } from '../src/lib/catalogIntake20261110';
import { intakeProducts20261113 } from '../src/lib/catalogIntake20261113';
import { intakeProducts20261114 } from '../src/lib/catalogIntake20261114';
import { PRODUCTS } from '../src/data/products';

// Offline, read-only: one row per draft product so none is left without a price, photo or decision.
const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const rows = [
  ['batch', 'id', 'name_en', 'category', 'collections', 'pack_options', 'reference_rate_per_base', 'base_unit', 'rate_status', 'image', 'photo_status', 'claims', 'status', 'owner_final_rate', 'owner_supplier', 'owner_publish_date', 'publish_these_drafts_first', 'owner_action_before_publish'],
];
const live = new Set(PRODUCTS.map(p => p.id));
const action: Record<string, string> = {
  'shilajit-gilgit-resin': 'Attach the purification and heavy-metal report for the batch; do not publish without it',
  'saffron-afghan-negin': 'Confirm origin and grade from the batch papers; add a colour-strength report only if one exists',
  'saffron-spanish-coupe': 'Publish only if the batch papers confirm Spanish origin and Coupe grade',
  'korean-red-ginseng-root': 'Rate is an estimate: set it from the supplier quote and confirm origin papers',
  'dates-safawi': 'Confirm origin and crop year from the supplier', 'dates-sukkari': 'Confirm origin and crop year from the supplier',
  'mulethi-licorice-root': 'Confirm origin from the supplier',
};
for (const [batch, list] of [['20261110', intakeProducts20261110()], ['20261113', intakeProducts20261113()], ['20261114', intakeProducts20261114()]] as const) {
  for (const p of list as any[]) {
    const c = p.commerce;
    const bundle = p.isBundle === true;
    const needs = bundle ? (p.componentIds as string[]).filter(id => !live.has(id)).join('|') : '';
    rows.push([batch, p.id, p.name_en, p.category, (p.collections || []).join('|'), c.options.map((o: any) => o.label).join('|'),
      bundle ? p.prices.Bundle : c.basePrice, bundle ? 'pack (fixed price)' : `${c.baseQuantity}${c.baseUnit}`,
      bundle ? 'computed from component reference rates, owner to confirm' : 'reference only, owner to confirm', p.image, /placeholder/.test(p.image) ? 'placeholder' : 'illustration, real photo needed', p.claimsVerification?.status, p.status, '', '', '', needs, action[p.id] || ''] as any);
  }
}
writeFileSync('docs/catalog/MASTER_INTAKE_REGISTER.csv', rows.map(r => r.map(q).join(',')).join('\n') + '\n', 'utf8');
console.log(`Wrote ${rows.length - 1} rows`);
