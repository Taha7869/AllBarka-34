import { writeFileSync } from 'node:fs';
import { PRODUCTS } from '../src/data/products';
import { intakeProducts20261110 } from '../src/lib/catalogIntake20261110';
import { intakeProducts20261113 } from '../src/lib/catalogIntake20261113';
import { intakeProducts20261114 } from '../src/lib/catalogIntake20261114';
import { intakeProducts20261115 } from '../src/lib/catalogIntake20261115';

// Offline, read-only: every product the repository knows, website seeds first, then each draft batch.
const SECTION: Record<string, string> = {
  'nuts': 'Nuts', 'dry-fruits': 'Dry fruits', 'dates': 'Dates', 'snacks-seeds': 'Seeds & snacks', 'oils': 'Oils',
  'essentials': 'Desi essentials', 'herbs-spices': 'Spices & masalay', 'murabba-jaat': 'Murabba', 'bundles': 'Bundles & deals',
  'celebration-boxes': 'Celebration boxes', 'gift-boxes': 'Bundles & deals', 'tea': 'Tea',
};
const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const rows: string[][] = [['section', 'id', 'name_en', 'name_ur', 'status', 'batch', 'packs']];
const packs = (p: any) => p.commerce?.options?.map((o: any) => o.label).join(' | ') || Object.keys(p.prices || {}).join(' | ');
const section = (p: any) => {
  const name = String(p.name_en || p.name);
  if ((p.collections || []).some((c: string) => /tea/.test(c))) return 'Tea';
  if (['nuts', 'dry-fruits', 'dates'].includes(p.category)) {
    // The store files dates and dried fruit under "nuts" in older seeds; the list groups them the way a buyer looks for them.
    if (/\b(dates?|khajoor|chohara)\b/i.test(name)) return 'Dates';
    if (/(raisin|kishmish|munakka|fig|anjeer|apricot|khubani|plum|aloobukhara|alubukhara|cranberr|blueberr|kiwi|mulberr|jujube|shahtoot)/i.test(name)) return 'Dry fruits';
    return 'Nuts';
  }
  return SECTION[p.category] || p.category;
};
for (const p of PRODUCTS as any[]) rows.push([section(p), p.id, p.name_en || p.name, p.name_ur || p.nameUr || '', 'Website (seed)', 'seed', packs(p)]);
for (const [batch, list] of [['20261110', intakeProducts20261110()], ['20261113', intakeProducts20261113()], ['20261114', intakeProducts20261114()], ['20261115', intakeProducts20261115()]] as const)
  for (const p of list as any[]) rows.push([section(p), p.id, p.name_en, p.name_ur, 'Draft: needs price, photo, publish', batch, packs(p)]);
writeFileSync('docs/catalog/MASTER_PRODUCT_LIST.csv', rows.map(r => r.map(q).join(',')).join('\n') + '\n', 'utf8');
const count: Record<string, [number, number]> = {};
for (const r of rows.slice(1)) { count[r[0]] ??= [0, 0]; count[r[0]][r[4].startsWith('Website') ? 0 : 1]++; }
console.log(rows.length - 1, JSON.stringify(count));
