// Read-only smoke check. Never creates/deletes probe products or loads Firebase credentials.
const base = process.env.BASE_URL || 'http://localhost:3000';
async function run() {
  const response = await fetch(new URL('/api/catalog/snapshot', base), { signal: AbortSignal.timeout(12000), cache: 'no-store' });
  const snapshot = await response.json();
  if (!response.ok || !Array.isArray(snapshot.catalog) || !Array.isArray(snapshot.boxes) || !['static', 'firestore'].includes(snapshot.source)
    || !/^[a-f0-9]{64}$/.test(snapshot.revision || '') || snapshot.catalog.length !== 89 || snapshot.boxes.length !== 3
    || snapshot.catalog.some(product => typeof product.id !== 'string' || !product.prices || Object.values(product.prices).some(price => !Number.isSafeInteger(price) || price <= 0))) {
    throw new Error('Catalogue is unavailable or invalid.');
  }
  console.log(`Validated public catalogue: ${snapshot.catalog.length} products, ${snapshot.boxes.length} boxes, source ${snapshot.source}. No writes were made.`);
}
run().catch(() => { console.error('Read-only catalogue smoke check failed.'); process.exitCode = 1; });
