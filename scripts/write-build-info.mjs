import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Explicit source roots: credentials and machine-local files never enter the hash.
const roots = ['src', 'public', 'scripts', 'server.ts', 'package.json', 'package-lock.json',
  'index.html', 'vite.config.ts', 'tsconfig.json', 'firestore.rules', 'firestore.indexes.json'];
const files = [];
function visit(relative) {
  for (const entry of readdirSync(relative, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) visit(name);
    else if (entry.isFile() && !entry.name.startsWith('.env')) files.push(name);
  }
}
for (const root of roots) {
  if (path.extname(root)) files.push(root);
  else visit(root);
}
const hash = createHash('sha256');
for (const file of files.sort()) hash.update(file.replaceAll('\\', '/')).update('\0').update(readFileSync(file)).update('\0');
const sourceHash = hash.digest('hex');
const candidate = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || '';
const commit = /^[a-f0-9]{40}$/i.test(candidate) ? candidate : null;
mkdirSync('build', { recursive: true });
writeFileSync('build/build-info.json', JSON.stringify({ sourceHash, commit, builtAt: new Date().toISOString() }, null, 2) + '\n');
console.log(`Build source: ${sourceHash.slice(0, 16)}`);
