import { pathToFileURL } from 'node:url';

export function verifyStaticConfig(env) {
  const missing = ['VITE_API_BASE_URL', 'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_APP_ID']
    .filter(key => !env[key]?.trim());
  if (missing.length) throw new Error(`Static deployment is missing: ${missing.join(', ')}`);
  const url = new URL(env.VITE_API_BASE_URL.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('VITE_API_BASE_URL must be an HTTPS commerce API origin without /api or credentials');
  }
  if (env.VITE_AI_PROVIDER === 'ollama') throw new Error('Static production must use the commerce API, not browser-local Ollama');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    verifyStaticConfig(process.env);
    console.log('Static frontend API origin and Firebase build variables are present. Verify live persistence separately.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
