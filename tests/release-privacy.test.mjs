import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function audit(content, extraEnv = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), 'allbarka-privacy-'));
  mkdirSync(path.join(directory, 'assets'));
  writeFileSync(path.join(directory, 'assets', 'fixture.js'), content);
  const env = { ...process.env, ...extraEnv };
  try { return spawnSync(process.execPath, ['scripts/audit-release.mjs', directory], { env, encoding: 'utf8' }); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

test('hosting-injected server secrets and their escaped form are rejected without logging values', () => {
  const secret = 'offline-only-private-fixture-12345\nsecond-line';
  for (const body of [secret, JSON.stringify(secret)]) {
    const result = audit(body, { N8N_INTEGRATION_SECRET: secret });
    assert.equal(result.status, 1); assert.match(result.stderr, /Server-only value N8N_INTEGRATION_SECRET/);
    assert.equal(result.stderr.includes(secret), false);
  }
});
test('only approved public build variables are allowed; public Firebase config remains supported', () => {
  const unsafe = audit('public fixture', { VITE_GROQ_API_KEY: 'offline-only-provider-fixture' });
  assert.equal(unsafe.status, 1); assert.match(unsafe.stderr, /Unapproved browser environment variable: VITE_GROQ_API_KEY/);
  assert.doesNotMatch(unsafe.stderr, /offline-only-provider-fixture/);
  assert.equal(audit('public fixture', { VITE_FIREBASE_API_KEY: 'public-firebase-web-configuration' }).status, 0);
});
test('provider-shaped tokens are caught even when their original environment variable is absent', () => {
  for (const token of ['gsk_' + 'z'.repeat(45), 'github_pat_' + 'y'.repeat(45), 'EAA' + 'x'.repeat(90)]) {
    const result = audit(token); assert.equal(result.status, 1); assert.match(result.stderr, /Provider token in browser artifact/);
    assert.equal(result.stderr.includes(token), false);
  }
});
