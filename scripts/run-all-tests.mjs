import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// Run every tracked test family and offline production checks; never use live integration credentials.
const env = { ...process.env };
for (const key of ['FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'FIRESTORE_EMULATOR_HOST',
  'FIREBASE_AUTH_EMULATOR_HOST', 'GOOGLE_APPLICATION_CREDENTIALS', 'N8N_AI_WEBHOOK_URL',
  'N8N_ORDER_WEBHOOK_URL', 'N8N_STATUS_WEBHOOK_URL', 'WHATSAPP_META_APP_SECRET',
  'WHATSAPP_BUSINESS_PHONE_ID', 'WHATSAPP_PARENT_VERIFIED']) delete env[key];
const files = fs.readdirSync('tests').filter(name => /\.test\.(?:ts|tsx|mjs)$/.test(name)).sort().map(name => `tests/${name}`);
const commands = [
  ['--import', 'tsx', '--test', '--test-isolation=none', ...files],
  ['--import', 'tsx', 'tests/run-backend-tests.mjs'],
  ['--import', 'tsx', 'scripts/verify-catalog-assets.ts'],
  ['scripts/verify-production.mjs'],
];
for (const args of commands) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.error) { console.error('Offline test process could not start:', result.error.code); process.exit(1); }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Full offline suite passed (${files.length} test files plus backend, assets and production checks).`);
