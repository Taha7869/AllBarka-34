import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import express from 'express';
import rateLimit from 'express-rate-limit';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import {
  CONSENT_POLICY_VERSION,
  CONSENT_STORAGE_KEY,
  STORAGE_INVENTORY,
  defaultConsentCategories,
  generateAnonymousConsentId,
  hasEffectiveConsent,
  isGpcEnabled,
  needsConsentPrompt,
  parseStoredConsent,
  validateConsentLogPayload,
  writeStoredConsent,
  readStoredConsent,
  type ConsentRecord,
} from '../src/lib/consent';
import { createConsentRouter } from '../src/lib/consentRouter';
import { ConsentProvider } from '../src/contexts/ConsentContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import ConsentGate from '../src/components/ConsentGate';
import CookieNotice from '../src/components/CookieNotice';
import Footer from '../src/components/Footer';
import PoliciesPage, { normalizePolicyTab } from '../src/pages/PoliciesPage';
import { memoryFirestore } from './helpers/memoryFirestore';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear() { map.clear(); },
    getItem(k: string) { return map.has(k) ? map.get(k)! : null; },
    key(i: number) { return Array.from(map.keys())[i] ?? null; },
    removeItem(k: string) { map.delete(k); },
    setItem(k: string, v: string) { map.set(k, String(v)); },
  };
}

test('consent helpers enforce GPC defaults, policy-version re-prompt, and strict payload validation', () => {
  assert.equal(isGpcEnabled({ globalPrivacyControl: true }), true);
  assert.equal(isGpcEnabled({ globalPrivacyControl: false }), false);
  assert.deepEqual(defaultConsentCategories(), { necessary: true, analytics: false, marketing: false });

  // No stored consent -> needs prompt and optional categories blocked
  assert.equal(needsConsentPrompt(null), true);
  assert.equal(hasEffectiveConsent(null, 'necessary'), true);
  assert.equal(hasEffectiveConsent(null, 'analytics'), false);
  assert.equal(hasEffectiveConsent(null, 'marketing'), false);

  // Stored consent on current version -> does not prompt and respects choices
  const anonId = generateAnonymousConsentId();
  assert.match(anonId, /^[a-zA-Z0-9_-]{8,64}$/);
  const record: ConsentRecord = {
    anonymousId: anonId,
    categories: { necessary: true, analytics: true, marketing: false },
    policyVersion: CONSENT_POLICY_VERSION,
    updatedAt: new Date().toISOString(),
    gpcRespected: false,
  };
  const storage = createMemoryStorage();
  storage.setItem('allbarka_storage_notice', '1');
  assert.equal(writeStoredConsent(record, storage), true);
  assert.equal(storage.getItem('allbarka_storage_notice'), null);
  const loaded = readStoredConsent(storage);
  assert.deepEqual(loaded, record);
  assert.equal(needsConsentPrompt(loaded), false);
  assert.equal(hasEffectiveConsent(loaded, 'analytics'), true);
  assert.equal(hasEffectiveConsent(loaded, 'marketing'), false);

  // Policy version bump -> must re-prompt and block optional categories until re-consented
  assert.equal(needsConsentPrompt(loaded, '2027-01-01'), true);
  assert.equal(hasEffectiveConsent(loaded, 'necessary', { currentVersion: '2027-01-01' }), true);
  assert.equal(hasEffectiveConsent(loaded, 'analytics', { currentVersion: '2027-01-01' }), false);

  // Corrupt JSON rejected safely
  assert.equal(parseStoredConsent('{bad'), null);
  assert.equal(parseStoredConsent(JSON.stringify({ ...record, categories: { necessary: false, analytics: true, marketing: true } })), null);

  // Payload validation strips PII and rejects malformed input
  const valid = validateConsentLogPayload({
    anonymousId: 'ab_1234567890abcdef',
    categories: { necessary: true, analytics: true, marketing: false, extra: 'drop-me' },
    policyVersion: CONSENT_POLICY_VERSION,
    timestamp: '2026-11-20T00:00:00.000Z',
    gpc: true,
    email: 'customer@example.com',
    phone: '03001234567',
    uid: 'user-123',
  });
  assert.ok(valid);
  assert.equal((valid as any).email, undefined);
  assert.equal((valid as any).phone, undefined);
  assert.equal((valid as any).uid, undefined);
  assert.equal((valid.categories as any).extra, undefined);
  assert.equal(valid.gpc, true);

  for (const bad of [
    null,
    {},
    { anonymousId: 'short', categories: { necessary: true, analytics: false, marketing: false }, policyVersion: '1' },
    { anonymousId: 'user@email.com', categories: { necessary: true, analytics: false, marketing: false }, policyVersion: '1' },
    { anonymousId: 'ab_1234567890', categories: { necessary: false, analytics: false, marketing: false }, policyVersion: '1' },
    { anonymousId: 'ab_1234567890', categories: { necessary: true, analytics: 'yes', marketing: false }, policyVersion: '1' },
    { anonymousId: 'ab_1234567890', categories: { necessary: true, analytics: false, marketing: false }, policyVersion: 'bad version!' },
    { anonymousId: 'ab_1234567890', categories: { necessary: true, analytics: false, marketing: false }, policyVersion: '1', timestamp: 'not-a-date' },
  ]) {
    assert.equal(validateConsentLogPayload(bad), null);
  }
});

test('POST /api/consent logs anonymous consent without PII, validates input, and enforces rate limit', async () => {
  const { db, records } = memoryFirestore({});
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  const limiter = rateLimit({ windowMs: 60 * 1000, max: 2, standardHeaders: true, legacyHeaders: false });
  app.use(createConsentRouter({ getDb: () => db as any, consentLimiter: limiter, now: () => Date.UTC(2026, 10, 20, 5, 0, 0) }));

  const server = app.listen(0);
  const port = (server.address() as any).port;
  const url = `http://127.0.0.1:${port}/api/consent`;

  try {
    // 1. Valid request with attempted PII fields in body + headers -> stored cleanly with zero PII
    const res1 = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SensitiveBrowser/1.0',
        'X-Forwarded-For': '203.0.113.10',
      },
      body: JSON.stringify({
        anonymousId: 'ab_abcdef1234567890',
        categories: { necessary: true, analytics: false, marketing: false },
        policyVersion: CONSENT_POLICY_VERSION,
        timestamp: '2026-11-20T04:59:00.000Z',
        gpc: true,
        email: 'never-store@example.com',
        phone: '+923001112223',
      }),
    });
    assert.equal(res1.status, 201);
    assert.equal(res1.headers.get('cache-control'), 'no-store');
    const body1 = await res1.json();
    assert.deepEqual(body1, { ok: true, recorded: true, policyVersion: CONSENT_POLICY_VERSION });

    const storedEntries = Array.from(records.entries()).filter(([k]) => k.startsWith('consentLogs/'));
    assert.equal(storedEntries.length, 1);
    const saved = storedEntries[0][1] as Record<string, any>;
    assert.deepEqual(Object.keys(saved).sort(), [
      'anonymousId',
      'categories',
      'clientTimestamp',
      'gpc',
      'policyVersion',
      'recordedAt',
    ]);
    assert.equal(saved.anonymousId, 'ab_abcdef1234567890');
    assert.equal(saved.gpc, true);
    assert.equal(saved.recordedAt, '2026-11-20T05:00:00.000Z');
    assert.ok(!JSON.stringify(saved).includes('never-store'));
    assert.ok(!JSON.stringify(saved).includes('203.0.113.10'));
    assert.ok(!JSON.stringify(saved).includes('SensitiveBrowser'));

    // 2. Invalid request -> 400 (same forwarded IP to count toward limiter)
    const res2 = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '203.0.113.10',
      },
      body: JSON.stringify({ anonymousId: 'bad', categories: { necessary: false } }),
    });
    assert.equal(res2.status, 400);

    // 3. Third request within window from same IP -> 429 rate-limited
    const res3 = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '203.0.113.10',
      },
      body: JSON.stringify({
        anonymousId: 'ab_abcdef1234567890',
        categories: { necessary: true, analytics: true, marketing: true },
        policyVersion: CONSENT_POLICY_VERSION,
      }),
    });
    assert.equal(res3.status, 429);
  } finally {
    server.close();
  }

  // Offline / no-DB mode degrades gracefully with 202
  const offlineApp = express();
  offlineApp.use(express.json());
  offlineApp.use(createConsentRouter({ getDb: () => null }));
  const offlineServer = offlineApp.listen(0);
  try {
    const res = await fetch(`http://127.0.0.1:${(offlineServer.address() as any).port}/api/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anonymousId: 'ab_offline123456789',
        categories: { necessary: true, analytics: false, marketing: false },
        policyVersion: CONSENT_POLICY_VERSION,
      }),
    });
    assert.equal(res.status, 202);
    const data = await res.json();
    assert.equal(data.recorded, false);
  } finally {
    offlineServer.close();
  }
});

test('CookieNotice, ConsentGate, Footer, and /policies/cookies render trilingual UI, equal buttons, GPC, and inventory', () => {
  // 1. Storage inventory covers real storage keys in EN/UR/AR
  const keys = STORAGE_INVENTORY.map((e) => e.key);
  for (const requiredKey of ['__session', CONSENT_STORAGE_KEY, 'allbarka_cart_v1', 'allbarka_language', 'allbarka_theme', 'allbarka_currency_preference', 'allbarka_seen:*']) {
    assert.ok(keys.includes(requiredKey), `Missing key in STORAGE_INVENTORY: ${requiredKey}`);
  }
  for (const entry of STORAGE_INVENTORY) {
    assert.ok(entry.purpose.en.length > 10 && entry.purpose.ur.length > 10 && entry.purpose.ar.length > 10, entry.key);
    assert.ok(entry.duration.en.length > 4 && entry.duration.ur.length > 4 && entry.duration.ar.length > 4, entry.key);
  }

  // 2. CookieNotice banner renders 3 equal-size buttons, GPC badge, mobile safe offset, and /policies/cookies link
  const bannerHtml = renderToStaticMarkup(
    <MemoryRouter>
      <LanguageProvider>
        <ConsentProvider initialGpc={true}>
          <CookieNotice />
        </ConsentProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
  assert.match(bannerHtml, /data-consent-banner/);
  assert.match(bannerHtml, /data-consent-action="accept-all"/);
  assert.match(bannerHtml, /data-consent-action="reject-all"/);
  assert.match(bannerHtml, /data-consent-action="choose-preferences"/);
  assert.match(bannerHtml, /data-gpc-indicator/);
  assert.match(bannerHtml, /\/policies\/cookies/);
  assert.match(bannerHtml, /min-h-\[44px\]/);
  assert.match(bannerHtml, /bottom-\[calc\(5\.25rem\+env\(safe-area-inset-bottom\)\)\]/);

  // 3. ConsentGate allows necessary, blocks analytics & marketing before consent
  const gateHtml = renderToStaticMarkup(
    <ConsentProvider initialGpc={true}>
      <ConsentGate category="necessary"><span data-gate-ok="necessary">OK</span></ConsentGate>
      <ConsentGate category="analytics"><span data-gate-blocked="analytics">NO</span></ConsentGate>
      <ConsentGate category="marketing"><span data-gate-blocked="marketing">NO</span></ConsentGate>
    </ConsentProvider>
  );
  assert.match(gateHtml, /data-gate-ok="necessary"/);
  assert.doesNotMatch(gateHtml, /data-gate-blocked="analytics"/);
  assert.doesNotMatch(gateHtml, /data-gate-blocked="marketing"/);

  // 4. Footer includes Cookie settings trigger button & /policies/cookies link
  const footerHtml = renderToStaticMarkup(
    <MemoryRouter>
      <LanguageProvider>
        <ConsentProvider>
          <Footer />
        </ConsentProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
  assert.match(footerHtml, /data-footer-cookie-settings/);
  assert.match(footerHtml, /Cookie settings/);
  assert.match(footerHtml, /\/policies\/cookies/);

  // 5. /policies/cookies normalizes cleanly and renders the code-derived inventory table
  assert.equal(normalizePolicyTab('cookies'), 'cookies');
  assert.equal(normalizePolicyTab('cookie-policy'), 'cookies');
  const policyHtml = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/policies/cookies']}>
      <LanguageProvider>
        <ConsentProvider>
          <PoliciesPage asPage={true} initialTab="cookies" />
        </ConsentProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
  assert.match(policyHtml, /data-cookies-policy-section/);
  assert.match(policyHtml, /data-policy-open-cookie-settings/);
  assert.match(policyHtml, /allbarka_consent_v1/);
  assert.match(policyHtml, /__session/);
  assert.match(policyHtml, /allbarka_cart_v1/);

  // 6. Server mounts consent router with rate limiter
  const serverSrc = fs.readFileSync('server.ts', 'utf8');
  assert.match(serverSrc, /createConsentRouter\(/);
  assert.match(serverSrc, /consentLimiter/);
});
