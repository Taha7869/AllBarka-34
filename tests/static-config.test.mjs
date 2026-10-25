import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { verifyStaticConfig, verifyStaticArtifact } from '../scripts/verify-static-config.mjs';

const valid = {
  VITE_API_BASE_URL: 'https://commerce.allbarka.dev',
  VITE_FIREBASE_API_KEY: `AIza${'A'.repeat(35)}`,
  VITE_FIREBASE_APP_ID: '1:1234567890:web:aabbcc112233',
  VITE_FIREBASE_PROJECT_ID: 'allbarka-live',
  VITE_FIREBASE_AUTH_DOMAIN: 'allbarka-live.firebaseapp.com',
};

test('static publication requires real-shaped public Firebase identifiers and an explicit API origin', () => {
  assert.deepEqual(verifyStaticConfig(valid), { apiOrigin: valid.VITE_API_BASE_URL });
  for (const key of Object.keys(valid)) assert.throws(() => verifyStaticConfig({ ...valid, [key]: '' }), new RegExp(key));
  assert.throws(() => verifyStaticConfig({ ...valid, VITE_FIREBASE_API_KEY: 'your_vite_firebase_api_key' }), /placeholders/);
  assert.throws(() => verifyStaticConfig({ ...valid, VITE_FIREBASE_APP_ID: 'not-a-web-app' }), /Web app identifier/);
});

test('static API origins reject HTTP, paths, credentials, fragments, query and placeholder hosts', () => {
  for (const origin of ['http://commerce.allbarka.dev', 'https://commerce.allbarka.dev/api', 'https://u:p@commerce.allbarka.dev',
    'https://commerce.allbarka.dev?x=1', 'https://commerce.allbarka.dev#fragment', 'https://commerce.allbarka.dev/path/..', 'https://commerce.allbarka.dev\\backslash', 'https://localhost', 'https://api.example.com', 'not-a-url']) {
    assert.throws(() => verifyStaticConfig({ ...valid, VITE_API_BASE_URL: origin }));
  }
});

test('private provider and Admin variables cannot be exposed through the Vite prefix', () => {
  for (const key of ['VITE_N8N_AI_WEBHOOK_SECRET', 'VITE_GROQ_API_KEY', 'VITE_FIREBASE_PRIVATE_KEY', 'VITE_GEMINI_API_KEY', 'VITE_AI_PROVIDER', 'VITE_N8N_INTEGRATION_SECRET', 'VITE_WHATSAPP_META_APP_SECRET']) {
    assert.throws(() => verifyStaticConfig({ ...valid, [key]: 'not-public' }), /Unapproved public build variables/);
  }
  assert.doesNotThrow(() => verifyStaticConfig({ ...valid, N8N_AI_WEBHOOK_SECRET: 'server-only-value', FIREBASE_PRIVATE_KEY: 'server-only-value' }));
});

function artifactFixture(callback) {
  const fixtureRoot = path.resolve(fileURLToPath(new URL('../.local-setup/static-config-tests/', import.meta.url)));
  fs.mkdirSync(fixtureRoot, { recursive: true });
  const directory = fs.mkdtempSync(path.join(fixtureRoot, 'allbarka-static-test-'));
  try {
    fs.writeFileSync(path.join(directory, 'index.html'), '<html>storefront</html>');
    fs.writeFileSync(path.join(directory, 'staticwebapp.config.json'), JSON.stringify({ navigationFallback: { rewrite: '/index.html', exclude: ['/api/*'] } }));
    callback(directory);
  } finally {
    if (path.dirname(path.resolve(directory)) !== fixtureRoot || !path.basename(directory).startsWith('allbarka-static-test-')) throw new Error('Unsafe fixture cleanup path');
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('actual static publish directory excludes server bundles, env files and private key material', () => artifactFixture(directory => {
  assert.doesNotThrow(() => verifyStaticArtifact(directory));
  for (const name of ['server.cjs', 'server.cjs.map', '.env.local', 'credential.key']) {
    fs.writeFileSync(path.join(directory, name), 'private');
    assert.throws(() => verifyStaticArtifact(directory), /Private server/);
    fs.unlinkSync(path.join(directory, name));
  }
  fs.writeFileSync(path.join(directory, 'main.js'), '-----BEGIN PRIVATE KEY-----');
  assert.throws(() => verifyStaticArtifact(directory), /credential material/);
  fs.writeFileSync(path.join(directory, 'main.js'), 'server-secret-value-123456789');
  assert.throws(() => verifyStaticArtifact(directory, { N8N_AI_WEBHOOK_SECRET: 'server-secret-value-123456789' }), /credential material/);
  assert.throws(() => verifyStaticArtifact(directory, { WHATSAPP_META_APP_SECRET: 'server-secret-value-123456789' }), /credential material/);
}));

test('actual static publish directory has index.html and a non-API SPA fallback', () => artifactFixture(directory => {
  fs.unlinkSync(path.join(directory, 'index.html'));
  assert.throws(() => verifyStaticArtifact(directory), /requires/);
  fs.writeFileSync(path.join(directory, 'index.html'), 'storefront');
  fs.writeFileSync(path.join(directory, 'staticwebapp.config.json'), JSON.stringify({ navigationFallback: { rewrite: '/index.html', exclude: [] } }));
  assert.throws(() => verifyStaticArtifact(directory), /excluding/);
}));

test('Azure and Netlify publish the checked browser-only build without passing server secrets', () => {
  const azure = fs.readFileSync(new URL('../.github/workflows/azure-static-web-apps-jolly-glacier-0c820da10.yml', import.meta.url), 'utf8');
  assert.match(azure, /app_location: "dist-client"/);
  assert.match(azure, /skip_app_build: true/);
  assert.ok(azure.indexOf('npm run verify:static-config') < azure.indexOf('npm run build:frontend'));
  assert.match(azure, /--artifact/);
  for (const key of Object.keys(valid)) assert.match(azure, new RegExp(`${key}:`));
  assert.doesNotMatch(azure, /FIREBASE_PRIVATE_KEY|N8N_.*SECRET|GROQ_API_KEY/);
  const netlify = fs.readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');
  assert.match(netlify, /publish = "dist-client"/);
  assert.ok(netlify.indexOf('from = "/api/*"') < netlify.indexOf('from = "/*"'));
  assert.match(netlify, /status = 404/);
});
