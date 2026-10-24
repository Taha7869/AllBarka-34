import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export const FLAGGED_PACKAGING_IDS = ['bid-box-umrah-tabarruk', 'bid-box-pyramid-favor', 'bid-box-card-nikkah', 'bid-box-birth-announcement'];
const PATHS = ['/api/health', '/api/commerce/readiness', '/api/catalog'];
const LIMIT = 1_048_576;
const boolean = value => typeof value === 'boolean' ? value : null;

/** Exactly three credential-free GET requests; no database SDK, webhook or write operation. */
export async function collectReadOnlyPreflight({ baseUrl = 'https://allbarka.com', expectedCommit = null, fetchImpl = fetch } = {}) {
  const base = new URL(baseUrl);
  if (base.username || base.password || base.search || base.hash || base.pathname !== '/' ||
    !(base.origin === 'https://allbarka.com' || (base.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(base.hostname)))) throw new Error('PREFLIGHT_ORIGIN_NOT_ALLOWED');
  if (expectedCommit !== null && !/^[a-f0-9]{40}$/i.test(expectedCommit)) throw new Error('PREFLIGHT_COMMIT_INVALID');
  const responses = await Promise.all(PATHS.map(async path => {
    try {
      const response = await fetchImpl(new URL(path, base), { method: 'GET', credentials: 'omit', redirect: 'error', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
      if (!response.ok) return { path, status: response.status, error: 'HTTP_ERROR' };
      const reader = response.body?.getReader(); if (!reader) return { path, status: response.status, error: 'EMPTY_RESPONSE' };
      const chunks = []; let bytes = 0;
      while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength; if (bytes > LIMIT) { await reader.cancel(); return { path, status: response.status, error: 'RESPONSE_TOO_LARGE' }; } chunks.push(part.value); }
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('INVALID_JSON_OBJECT');
      return { path, status: response.status, bytes, data };
    } catch { return { path, status: null, error: 'REQUEST_OR_JSON_FAILED' }; }
  }));
  const health = responses[0].data || {}; const readiness = responses[1].data || {}; const catalog = responses[2].data || {};
  const commit = /^[a-f0-9]{40}$/i.test(health.build?.commit || '') ? health.build.commit : null;
  const products = Array.isArray(catalog.products) ? catalog.products : [];
  return { generatedAt: new Date().toISOString(), timezone: 'Asia/Karachi', scope: 'Public deployed endpoints only; not private merchant records or feature deployment certification',
    mode: 'read-only', origin: base.origin, methods: ['GET'], requests: responses.map(({ data, ...summary }) => summary),
    expectedFeatureCommit: expectedCommit, deployedCommit: commit, deployedMatchesExpected: expectedCommit && commit ? expectedCommit === commit : null,
    health: { status: health.status === 'ok' ? 'ok' : null, aiConfigured: boolean(health.aiConfigured), aiConnectivityVerified: boolean(health.aiConnectivityVerified) },
    readiness: Object.fromEntries(['authActive', 'databaseInitialized', 'databaseConnected', 'durablePersistenceReady', 'savedOrderVerifiedThisProcess', 'aiConfigured', 'orderWebhookConfigured'].map(key => [key, boolean(readiness[key])])),
    publicProductCount: Array.isArray(catalog.products) ? products.length : null,
    flaggedProducts: FLAGGED_PACKAGING_IDS.map(id => { const product = products.find(product => product?.id === id); return { id, found: !!product, active: boolean(product?.active), priceOptions: product?.prices && typeof product.prices === 'object' ? Object.keys(product.prices).length : null, variants: Array.isArray(product?.variants) ? product.variants.length : null }; }),
    writesPerformed: 0, acceptedOrderTested: false, authRolesTested: false, storageUploadTested: false, n8nExecutionTested: false,
    limitations: ['An older deployed build cannot certify the feature branch.', 'Configured flags do not establish successful order, Auth, Storage or n8n execution.', 'Unavailable public products do not expose the underlying private saved records.'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const options = { baseUrl: 'https://allbarka.com', expectedCommit: null }; let output = 'docs/admin-expansion/evidence/stage6-live-readonly.json';
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i]; const value = process.argv[i + 1]; if (!value) throw new Error('PREFLIGHT_ARGUMENT_INVALID');
    if (key === '--base-url') options.baseUrl = value;
    else if (key === '--expected-commit') options.expectedCommit = value;
    else if (key === '--output') output = value;
    else throw new Error('PREFLIGHT_ARGUMENT_INVALID');
  }
  const report = await collectReadOnlyPreflight(options); await mkdir(dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output, requests: report.requests, deployedMatchesExpected: report.deployedMatchesExpected, databaseConnected: report.readiness.databaseConnected, writesPerformed: report.writesPerformed }));
}
