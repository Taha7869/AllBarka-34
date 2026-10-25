import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const publicVariables = new Set([
  'VITE_API_BASE_URL', 'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_MEASUREMENT_ID', 'VITE_FIRESTORE_DATABASE_ID',
]);
const placeholder = value => /(?:^your[_-]|replace[_-]|change[_-]?me|<[^>]+>|example\.(?:com|org|net)|\.example(?:\/|$))/i.test(value);

/** Static hosting cannot run Express: its build must name a separate real HTTPS API. */
export function verifyStaticConfig(env) {
  const required = ['VITE_API_BASE_URL', 'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_APP_ID', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_AUTH_DOMAIN'];
  const missing = required.filter(key => typeof env[key] !== 'string' || !env[key].trim());
  if (missing.length) throw new Error(`Static deployment is missing: ${missing.join(', ')}`);
  const unknown = Object.keys(env).filter(key => key.startsWith('VITE_') && !publicVariables.has(key) && env[key]?.trim());
  if (unknown.length) throw new Error(`Unapproved public build variables: ${unknown.join(', ')}. Keep server secrets outside VITE_*.`);
  const placeholders = required.filter(key => placeholder(env[key].trim()));
  if (placeholders.length) throw new Error(`Replace static deployment placeholders: ${placeholders.join(', ')}`);
  if (!/^https:\/\/[^/?#\\\s]+\/?$/i.test(env.VITE_API_BASE_URL.trim())) throw new Error('VITE_API_BASE_URL must be an exact HTTPS origin without a path');
  let api;
  try { api = new URL(env.VITE_API_BASE_URL.trim()); } catch { throw new Error('VITE_API_BASE_URL must be an HTTPS commerce API origin'); }
  if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash || api.pathname !== '/' || api.hostname === 'localhost') {
    throw new Error('VITE_API_BASE_URL must be an HTTPS commerce API origin without /api, credentials, query or fragment');
  }
  if (!/^AIza[\w-]{35}$/.test(env.VITE_FIREBASE_API_KEY.trim())) throw new Error('VITE_FIREBASE_API_KEY must be the public Firebase Web app API key');
  if (!/^1:\d+:web:[a-f\d]+$/i.test(env.VITE_FIREBASE_APP_ID.trim())) throw new Error('VITE_FIREBASE_APP_ID must be the Firebase Web app identifier');
  if (!/^[a-z][a-z\d-]{4,29}$/.test(env.VITE_FIREBASE_PROJECT_ID.trim())) throw new Error('VITE_FIREBASE_PROJECT_ID must be the Firebase project identifier');
  if (!/^(?!-)[a-z\d-]+(?:\.[a-z\d-]+)+$/i.test(env.VITE_FIREBASE_AUTH_DOMAIN.trim())) throw new Error('VITE_FIREBASE_AUTH_DOMAIN must be the Firebase auth hostname without a scheme or path');
  return { apiOrigin: api.origin };
}

export function verifyStaticArtifact(directory, env = {}) {
  const root = path.resolve(directory);
  if (!fs.existsSync(path.join(root, 'index.html')) || !fs.existsSync(path.join(root, 'staticwebapp.config.json'))) {
    throw new Error('Static publication requires dist-client/index.html and its SPA configuration');
  }
  const secrets = Object.entries(env).filter(([key, value]) =>
    /^(?:N8N_(?:.*SECRET|.*WEBHOOK_URL)|AI_GUEST_HASH_SECRET|FIREBASE_PRIVATE_KEY|GROQ_API_KEY|GEMINI_API_KEY|GOOGLE_PRIVATE_KEY|WHATSAPP_META_APP_SECRET|WHATSAPP_ACCESS_TOKEN)$/.test(key)
    && typeof value === 'string' && value.length >= 16 && !placeholder(value));
  const visit = directoryPath => {
    for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
      const filename = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) { visit(filename); continue; }
      if (/^\.env(?:\.|$)|^server\.cjs(?:\.map)?$|\.(?:pem|key)$/i.test(entry.name)) throw new Error('Private server/configuration file found in static publication');
      if (!/\.(?:js|css|html|json|map|txt)$/i.test(entry.name)) continue;
      const content = fs.readFileSync(filename, 'utf8');
      if (/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(content) || secrets.some(([, value]) => content.includes(value))) {
        throw new Error('Server credential material found in static publication');
      }
    }
  };
  visit(root);
  const spa = JSON.parse(fs.readFileSync(path.join(root, 'staticwebapp.config.json'), 'utf8'));
  if (spa.navigationFallback?.rewrite !== '/index.html' || !spa.navigationFallback?.exclude?.includes('/api/*')) {
    throw new Error('Static SPA fallback must serve index.html while excluding /api/*');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    verifyStaticConfig(process.env);
    if (process.argv.includes('--artifact')) verifyStaticArtifact('dist-client', process.env);
    console.log('Static Firebase/API configuration is present; live authentication and durable API readiness require separate verification.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
