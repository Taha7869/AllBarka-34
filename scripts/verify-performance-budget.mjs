import fs from 'node:fs';
import { gzipSync } from 'node:zlib';

// Build-transfer guard, not a Lighthouse/Core Web Vitals score. Dynamic routes and Auth are separate.
const manifest = JSON.parse(fs.readFileSync('dist/.vite/manifest.json', 'utf8'));
const entry = manifest['index.html'];
if (!entry?.isEntry) throw new Error('Missing production entry manifest');
const seen = new Set(); let staticBytes = 0, staticGzip = 0;
function inspect(key) {
  if (seen.has(key)) return; seen.add(key);
  const item = manifest[key]; if (!item) throw new Error('Missing static dependency');
  const bytes = fs.readFileSync('dist/' + item.file); staticBytes += bytes.length; staticGzip += gzipSync(bytes).length;
  for (const ref of item.imports || []) inspect(ref);
}
inspect('index.html');
const entryGzip = gzipSync(fs.readFileSync('dist/' + entry.file)).length;
if (entryGzip > 105 * 1024 || staticGzip > 300 * 1024) throw new Error('Storefront JavaScript transfer budget exceeded');
if (!Object.values(manifest).some(item => item.name === 'catalog-data')) throw new Error('Missing independently cached catalogue registry');
console.log(JSON.stringify({ entryGzip, staticBytes, staticGzip, staticFiles: seen.size, entryBudget: 105 * 1024, staticBudget: 300 * 1024 }));
console.log('Storefront production transfer budgets passed. Browser field performance still needs measurement.');
