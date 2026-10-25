import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const artifact = process.argv[2] || 'dist';
if (!existsSync(artifact)) throw new Error('Build the browser artifact before auditing it.');
const privateValues = [];
for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  if (!existsSync(name)) continue;
  for (const [key, value] of Object.entries(dotenv.parse(readFileSync(name)))) {
    if (key.startsWith('VITE_')) {
      if (/SECRET|PRIVATE|PASSWORD|WEBHOOK|ACCESS_TOKEN|SERVICE_ACCOUNT/i.test(key)) throw new Error(`Unsafe browser environment variable: ${key}`);
    } else if (value.length >= 12 && /KEY|SECRET|TOKEN|PASSWORD|CLIENT_EMAIL|WEBHOOK_URL|TEST_PHONE/i.test(key)) {
      privateValues.push([key, value]);
    }
  }
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
    for (const [key, value] of privateValues) {
      const encoded = JSON.stringify(value).slice(1, -1);
      if (content.includes(value) || content.includes(encoded)) throw new Error(`Server-only value ${key} found in ${file}`);
    }
    checked++;
  }
}
inspect(artifact);
console.log(`Release privacy audit passed (${checked} text artifacts; no private values printed).`);
