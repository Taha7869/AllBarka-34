import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { publicVariables } from './verify-static-config.mjs';

const artifact = process.argv[2] || 'dist';
if (!existsSync(artifact)) throw new Error('Build the browser artifact before auditing it.');
const privateValues = [];
function inspectEnvironment(env) {
  for (const [key, value] of Object.entries(env)) {
    if (typeof value !== 'string' || !value) continue;
    if (key.startsWith('VITE_')) {
      if (!publicVariables.has(key)) throw new Error(`Unapproved browser environment variable: ${key}`);
    } else if (value.length >= 12 && /KEY|SECRET|TOKEN|PASSWORD|CLIENT_EMAIL|WEBHOOK_URL|TEST_PHONE/i.test(key)) {
      privateValues.push([key, value]);
    }
  }
}
// Hosting providers inject secrets into process.env, without creating a .env file.
inspectEnvironment(process.env);
for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  if (!existsSync(name)) continue;
  inspectEnvironment(dotenv.parse(readFileSync(name)));
}
let checked = 0;
function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { inspect(file); continue; }
    if (entry.name.startsWith('.env') || /server\.cjs|service[-_]account|firebase-adminsdk/i.test(entry.name)) {
      throw new Error(`Private file in browser artifact: ${file}`);
    }
    if (!/\.(?:js|css|html|json|map|txt|xml|svg)$/i.test(entry.name)) continue;
    const content = readFileSync(file, 'utf8');
    if (/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(content)) throw new Error(`Private key in browser artifact: ${file}`);
    if (/\b(?:gsk_[A-Za-z0-9]{40,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|EAA[A-Za-z0-9]{80,})\b/.test(content)) {
      throw new Error(`Provider token in browser artifact: ${file}`);
    }
    for (const [key, value] of privateValues) {
      const encoded = JSON.stringify(value).slice(1, -1);
      if (content.includes(value) || content.includes(encoded)) throw new Error(`Server-only value ${key} found in ${file}`);
    }
    checked++;
  }
}
inspect(artifact);
console.log(`Release privacy audit passed (${checked} text artifacts; no private values printed).`);
