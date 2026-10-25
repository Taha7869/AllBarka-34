import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import type { User } from 'firebase/auth';
import { authenticateGoogle, googleAuthConfigured, googleAuthErrorKey, type GoogleAuthSdk } from '../src/lib/googleAuthentication';
import { claimPendingOrder, emailProfileWrite, patronProfileFromIdentity } from '../src/lib/emailAuthentication';
import { authTranslations } from '../src/contexts/authTranslations';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import AuthModal from '../src/components/AuthModal';

const renderAuth = (initialMode: 'signin' | 'signup' | 'forgot_password' = 'signin', isOpen = true) => renderToString(React.createElement(LanguageProvider, { children: React.createElement(AuthModal, { isOpen, initialMode, onClose: () => {} }) }));

test('sign-in entry exposes real email and Google buttons before requesting any credentials', () => {
  const html = renderAuth();
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /<button[^>]+type="button"[^>]*>[\s\S]*?Continue with Google/);
  assert.match(html, /<button[^>]+data-auth-focus="true"[^>]*>[\s\S]*?Continue with email/);
  assert.match(html, /Create account/);
  assert.match(html, /creates one on your first visit/);
  assert.doesNotMatch(html, /<input |<form |type="tel"|Send sign-in link/);
  assert.equal(renderAuth('signin', false), '');
});

test('email account creation has explicit name, email and confirmed password fields with a return path', () => {
  const html = renderAuth('signup');
  assert.match(html, /Create your account/);
  assert.match(html, /Back to sign-in options/);
  assert.match(html, /autocomplete="name" maxlength="80"/i);
  assert.match(html, /type="email" autocomplete="email"/i);
  assert.equal((html.match(/autocomplete="new-password" minlength="8"/gi) || []).length, 2);
  assert.match(html, /Confirm password/);
  assert.match(html, /signed in once it is created/);
  assert.match(html, /Already have an account/);
  assert.doesNotMatch(html, /Continue with Google|type="tel"/);
});

test('password reset requests an email without password, registration or a provider switch', () => {
  const html = renderAuth('forgot_password');
  assert.match(html, /Back to sign in/);
  assert.match(html, /type="email"/);
  assert.match(html, /Send reset link/);
  assert.doesNotMatch(html, /type="password"|Create account|Continue with Google/);
});

const googleUser = {
  uid: 'verified-google-customer', email: 'patron@example.test', displayName: 'Taha Google Patron',
  metadata: { creationTime: '2026-10-03T00:00:00Z' }, getIdToken: async () => 'verified-google-id-token',
} as User;

function pendingOrder() {
  const records = new Map([['pendingOrderId', 'AB-GOOGLE-ORDER'], ['pendingClaimToken', 'private-claim-token']]);
  const storage = { getItem: (key: string) => records.get(key) || null, removeItem: (key: string) => { records.delete(key); } };
  return { records, storage };
}

test('Google authentication starts the ready SDK in the same click turn and returns only verified identity', async () => {
  const calls: string[] = [];
  const adapter: GoogleAuthSdk = { signIn: language => { calls.push(language); return Promise.resolve(googleUser); } };
  const signingIn = authenticateGoogle('ur', adapter);
  assert.deepEqual(calls, ['ur'], 'the popup must start before a preload await loses user activation');
  assert.equal(await signingIn, googleUser);
  const profile = patronProfileFromIdentity(googleUser, { uid: 'forged-user', email: 'forged@example.test' });
  assert.equal(profile.uid, googleUser.uid);
  assert.equal(profile.email, googleUser.email);
});

test('missing Firebase public web configuration cannot be treated as successful Google setup', () => {
  const configured = { apiKey: 'valid-public-web-key', appId: '1:123:web:456', authDomain: 'allbarka-live.firebaseapp.com' };
  assert.equal(googleAuthConfigured(configured), true);
  for (const [key, value] of [['apiKey', ''], ['appId', ''], ['authDomain', ''], ['apiKey', 'your_vite_firebase_api_key'], ['appId', undefined]] as const) {
    assert.equal(googleAuthConfigured({ ...configured, [key]: value }), false, `${key} must be configured`);
  }
});

test('blocked, cancelled, conflicting and unavailable Google sign-in remain actionable failures', async () => {
  const expected = {
    'auth/popup-blocked': 'auth.error.googlePopupBlocked',
    'auth/popup-closed-by-user': 'auth.error.googleCancelled',
    'auth/cancelled-popup-request': 'auth.error.googleCancelled',
    'auth/account-exists-with-different-credential': 'auth.error.googleAccountExists',
    'auth/credential-already-in-use': 'auth.error.googleAccountExists',
    'auth/unauthorized-domain': 'auth.error.googleUnavailable',
    'auth/google-unavailable': 'auth.error.googleUnavailable',
    'auth/operation-not-allowed': 'auth.error.googleUnavailable',
    'auth/invalid-api-key': 'auth.error.googleUnavailable',
    'auth/network-request-failed': 'auth.error.network',
  };
  for (const [code, key] of Object.entries(expected)) {
    const failure = { code, message: 'Private provider diagnostics', credential: 'private-credential' };
    await assert.rejects(() => authenticateGoogle('en', { signIn: () => Promise.reject(failure) }), error => error === failure);
    assert.equal(googleAuthErrorKey(code), key);
    for (const language of ['en', 'ur', 'ar'] as const) assert.ok(authTranslations[language][key].trim());
  }
  await assert.rejects(() => authenticateGoogle('en', { signIn: () => { throw { code: 'auth/popup-blocked' }; } }), (error: any) => error.code === 'auth/popup-blocked');
  assert.equal(googleAuthErrorKey('unknown-private-error'), 'auth.error.unexpected');
});

test('Google profile initialization shares the rule-allowed email path and preserves existing customer data', () => {
  assert.deepEqual(emailProfileWrite(googleUser, '', null, 123), { name: googleUser.displayName, phone: '', createdAt: 123, updatedAt: 123 });
  assert.equal(emailProfileWrite(googleUser, '', { name: 'Customer chosen name', phone: '03160000000', loyaltyPoints: 50 }, 123), null);
  assert.deepEqual(emailProfileWrite(googleUser, '', { phone: '03160000000', loyaltyPoints: 50 }, 123), { name: googleUser.displayName, updatedAt: 123 });
});

test('Google identity claims guest orders only with a verified token and explicit server success', async () => {
  const { records, storage } = pendingOrder();
  const request: typeof fetch = async (path, options) => {
    assert.equal(path, '/api/orders/claim');
    assert.equal((options?.headers as Record<string, string>).Authorization, 'Bearer verified-google-id-token');
    assert.deepEqual(JSON.parse(options?.body as string), { orderId: 'AB-GOOGLE-ORDER', claimToken: 'private-claim-token' });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };
  assert.equal(await claimPendingOrder(googleUser, async () => new Response(JSON.stringify({ success: false }), { status: 200 }), storage), false);
  assert.equal(records.size, 2);
  assert.equal(await claimPendingOrder(googleUser, request, storage), true);
  assert.equal(records.size, 0);
});

test('a stalled token, fetch or response body has one deadline and leaves guest recovery keys intact', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    let finishToken!: (token: string) => void;
    let requests = 0;
    const { records, storage } = pendingOrder();
    const stalledToken = { getIdToken: () => new Promise<string>(resolve => { finishToken = resolve; }) };
    const blocked = claimPendingOrder(stalledToken, async () => { requests++; return new Response('{"success":true}'); }, storage, 20);
    t.mock.timers.tick(21);
    assert.equal(await blocked, false);
    assert.equal(records.size, 2);
    finishToken('late-token'); await Promise.resolve(); await Promise.resolve();
    assert.equal(requests, 0, 'a token arriving after the deadline must not start a claim');
    const network = claimPendingOrder(googleUser, () => new Promise<Response>(() => {}), storage, 20);
    await Promise.resolve(); await Promise.resolve();
    t.mock.timers.tick(21);
    assert.equal(await network, false);
    assert.equal(records.size, 2);
    const body = claimPendingOrder(googleUser, async () => ({ ok: true, json: () => new Promise(() => {}) }) as unknown as Response, storage, 20);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    t.mock.timers.tick(21);
    assert.equal(await body, false);
    assert.equal(records.size, 2);
  } finally { t.mock.timers.reset(); }
});

test('an earlier successful guest claim cannot delete a newer order recovery token', async () => {
  const { records, storage } = pendingOrder();
  const request: typeof fetch = async () => {
    records.set('pendingOrderId', 'AB-NEWER-ORDER'); records.set('pendingClaimToken', 'newer-private-token');
    return new Response('{"success":true}', { status: 200 });
  };
  assert.equal(await claimPendingOrder(googleUser, request, storage), true);
  assert.deepEqual([...records.entries()], [['pendingOrderId', 'AB-NEWER-ORDER'], ['pendingClaimToken', 'newer-private-token']]);
});

test('Google and email controls/errors have complete English, Urdu and Arabic copy', () => {
  const keys = Object.keys(authTranslations.en).sort();
  for (const language of ['en', 'ur', 'ar'] as const) {
    assert.deepEqual(Object.keys(authTranslations[language]).sort(), keys);
    for (const value of Object.values(authTranslations[language])) assert.ok(value.trim());
  }
  for (const language of ['ur', 'ar'] as const) {
    for (const key of ['auth.google', 'auth.googleWorking', 'auth.googleOrEmail', 'auth.error.googlePopupBlocked', 'auth.error.googleCancelled', 'auth.error.googleAccountExists', 'auth.error.googleUnavailable']) assert.match(authTranslations[language][key], /[\u0600-\u06ff]/);
  }
});
