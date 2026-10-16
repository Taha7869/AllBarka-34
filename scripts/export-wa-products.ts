import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { PRODUCTS } from '../src/data/products';
import { buildWaProductRows, serializeWaProductsCsv } from '../src/lib/waProductsExport';

const rows = buildWaProductRows(PRODUCTS);
const jsonPath = path.resolve(process.cwd(), 'n8n/wa_products_latest.json');
const csvPath = path.resolve(process.cwd(), 'n8n/wa_products_latest.csv');

writeFileSync(jsonPath, JSON.stringify(rows, null, 2) + '\n', 'utf8');
writeFileSync(csvPath, serializeWaProductsCsv(rows), 'utf8');

console.log(
  `Exported ${rows.length} wa_products variant rows from ${PRODUCTS.length} canonical catalog products to:\n` +
  `  - ${jsonPath}\n` +
  `  - ${csvPath}`
);
