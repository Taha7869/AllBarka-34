import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import type { User } from 'firebase/auth';
import { authenticateEmail, claimPendingOrder, emailAuthErrorKey, emailProfileWrite, patronProfileFromIdentity, type EmailAuthSdk } from '../src/lib/emailAuthentication';
import { authTranslations } from '../src/contexts/authTranslations';
import { authenticatePatronCredentials } from '../src/lib/serverAuthentication';

test('explicit email account token wins over a previous account session during guest order claims', async () => {
  const calls: string[] = [];
  const claims = await authenticatePatronCredentials('Bearer new-account-token', 'old-account-session', {
    verifyIdToken: async token => { calls.push(token); return { uid: 'new-account' }; },
    verifySessionCookie: async () => { calls.push('old-cookie'); return { uid: 'old-account' }; },
  });
  assert.equal(claims?.uid, 'new-account');
  assert.deepEqual(calls, ['new-account-token']);
});

test('a stale or revoked cookie cannot reject the new account explicit token', async () => {
  const claims = await authenticatePatronCredentials('Bearer new-account-token', 'revoked-session', {
    verifyIdToken: async () => ({ uid: 'new-account' }),
    verifySessionCookie: async () => { throw new Error('Revoked cookie'); },
  });
  assert.equal(claims?.uid, 'new-account');
});

test('rejected explicit token never grants the previous cookie account access', async () => {
  let cookieChecks = 0;
  await assert.rejects(authenticatePatronCredentials('Bearer expired-token', 'valid-other-account-cookie', {
    verifyIdToken: async () => { throw new Error('Expired token'); },
    verifySessionCookie: async () => { cookieChecks++; return { uid: 'other-account' }; },
  }), /Expired token/);
  assert.equal(cookieChecks, 0);
});

test('cookie-only account requests still verify revocation and retain their authenticated identity', async () => {
  const claims = await authenticatePatronCredentials(undefined, 'account-session', {
    verifyIdToken: async () => { throw new Error('Unexpected token verification'); },
    verifySessionCookie: async (cookie, checkRevoked) => {
      assert.equal(cookie, 'account-session'); assert.equal(checkRevoked, true);
      return { uid: 'cookie-account' };
    },
  });
  assert.equal(claims?.uid, 'cookie-account');
});

test('guest requests without credentials stay anonymous', async () => {
  const claims = await authenticatePatronCredentials(undefined, '', {
    verifyIdToken: async () => { throw new Error('Unexpected token verification'); },
    verifySessionCookie: async () => { throw new Error('Unexpected cookie verification'); },
  });
  assert.equal(claims, null);
});

test('malformed or empty explicit credentials fail without using a cookie', async () => {
  for (const authorization of ['Basic account', 'Bearer ', '']) {
    await assert.rejects(authenticatePatronCredentials(authorization, 'other-account-cookie', {
      verifyIdToken: async () => { throw new Error('Unexpected token verification'); },
      verifySessionCookie: async () => { throw new Error('Unexpected cookie verification'); },
    }), /Invalid authorization header|Missing bearer token/);
  }
});

const user = { uid: 'email-patron', email: 'patron@example.test', displayName: 'Taha', getIdToken: async () => 'verified-email-token' } as User;
function sdk() {
  const calls: unknown[][] = [];
  const adapter: EmailAuthSdk = {
    signIn: async (...credentials) => { calls.push(['signin', ...credentials]); return user; },
    signUp: async (...credentials) => { calls.push(['signup', ...credentials]); return user; },
    reset: async email => { calls.push(['reset', email]); },
    updateName: async (account, name) => { calls.push(['name', account.uid, name]); },
  };
  return { calls, adapter };
}

test('email sign-in sends exact password and normalized email to the email provider', async () => {
  const { adapter, calls } = sdk();
  const result = await authenticateEmail({ mode: 'signin', email: '  patron@example.test  ', password: ' existing pass ' }, adapter);
  assert.equal(result.user, user);
  assert.equal(result.resetSent, false);
  assert.deepEqual(calls, [['signin', 'patron@example.test', ' existing pass ']]);
});

test('email login cannot silently create an account when credentials are rejected', async () => {
  const { adapter, calls } = sdk();
  adapter.signIn = async (...credentials) => { calls.push(['signin', ...credentials]); throw { code: 'auth/invalid-credential' }; };
  await assert.rejects(() => authenticateEmail({ mode: 'signin', email: user.email!, password: 'pass1234' }, adapter), (failure: any) => emailAuthErrorKey(failure.code) === 'auth.error.credentials');
  assert.deepEqual(calls, [['signin', user.email, 'pass1234']]);
});

test('duplicate email signup returns a previous-method recovery message without a login or account lookup', async () => {
  const { adapter, calls } = sdk();
  adapter.signUp = async (...credentials) => { calls.push(['signup', ...credentials]); throw { code: 'auth/email-already-in-use' }; };
  await assert.rejects(() => authenticateEmail({ mode: 'signup', email: user.email!, name: 'Taha', password: 'pass1234', confirmPassword: 'pass1234' }, adapter), (failure: any) => emailAuthErrorKey(failure.code) === 'auth.error.emailExists');
  assert.deepEqual(calls, [['signup', user.email, 'pass1234']]);
  assert.match(authTranslations.en['auth.error.emailExists'], /previous method/);
});

test('email signup checks name, strength and confirmation before account creation and records display name', async () => {
  const { adapter, calls } = sdk();
  const valid = { mode: 'signup' as const, email: 'patron@example.test', name: '  Taha Patron  ', password: 'strong pass', confirmPassword: 'strong pass' };
  await assert.rejects(() => authenticateEmail({ ...valid, confirmPassword: 'other pass' }, adapter), (error: any) => error.code === 'auth/password-mismatch');
  await assert.rejects(() => authenticateEmail({ ...valid, password: '1234567', confirmPassword: '1234567' }, adapter), (error: any) => error.code === 'auth/weak-password');
  await assert.rejects(() => authenticateEmail({ ...valid, name: '' }, adapter), (error: any) => error.code === 'auth/missing-name');
  assert.equal(calls.length, 0);
  assert.equal((await authenticateEmail(valid, adapter)).user, user);
  assert.deepEqual(calls, [['signup', 'patron@example.test', 'strong pass'], ['name', user.uid, 'Taha Patron']]);
});

test('existing short passwords remain usable for sign-in and invalid email never reaches Firebase', async () => {
  const { adapter, calls } = sdk();
  await authenticateEmail({ mode: 'signin', email: user.email!, password: 'old123' }, adapter);
  await assert.rejects(() => authenticateEmail({ mode: 'signin', email: '+923001234567', password: 'old123' }, adapter), (error: any) => error.code === 'auth/invalid-email');
  await assert.rejects(() => authenticateEmail({ mode: 'signin', email: user.email!, password: '' }, adapter), (error: any) => error.code === 'auth/missing-password');
  assert.equal(calls.length, 1);
});

test('password reset uses email only and does not disclose whether the account exists', async () => {
  const { adapter, calls } = sdk();
  assert.deepEqual(await authenticateEmail({ mode: 'forgot_password', email: ' patron@example.test ' }, adapter), { user: null, resetSent: true });
  assert.deepEqual(calls, [['reset', 'patron@example.test']]);
  adapter.reset = async () => { throw { code: 'auth/user-not-found' }; };
  assert.deepEqual(await authenticateEmail({ mode: 'forgot_password', email: 'missing@example.test' }, adapter), { user: null, resetSent: true });
});

test('provider-disabled and network failures remain honest failures with complete translated messages', async () => {
  const { adapter } = sdk();
  adapter.signIn = async () => { throw { code: 'auth/operation-not-allowed' }; };
  await assert.rejects(() => authenticateEmail({ mode: 'signin', email: user.email!, password: 'pass1234' }, adapter), (error: any) => emailAuthErrorKey(error.code) === 'auth.error.unavailable');
  assert.equal(emailAuthErrorKey('auth/network-request-failed'), 'auth.error.network');
  assert.equal(emailAuthErrorKey('auth/invalid-api-key'), 'auth.error.unavailable');
  assert.equal(emailAuthErrorKey('auth/user-not-found'), emailAuthErrorKey('auth/wrong-password'));
  for (const language of ['en', 'ur', 'ar'] as const) {
    assert.deepEqual(Object.keys(authTranslations[language]).sort(), Object.keys(authTranslations.en).sort());
    for (const value of Object.values(authTranslations[language])) assert.ok(value.trim());
  }
});

test('failed optional name write never reports successful account creation as a failed login', async () => {
  const { adapter } = sdk();
  adapter.updateName = async () => { throw new Error('Profile service unavailable'); };
  const result = await authenticateEmail({ mode: 'signup', email: user.email!, name: 'Taha', password: 'pass1234', confirmPassword: 'pass1234' }, adapter);
  assert.equal(result.user, user);
});

test('profile creation writes only rule-allowed contact fields and existing server documents get safe name-only updates', () => {
  const creation = emailProfileWrite(user, ' Taha Patron ', null, 1234)!;
  assert.deepEqual(creation, { name: 'Taha Patron', phone: '', createdAt: 1234, updatedAt: 1234 });
  const createAllowed = ['name', 'phone', 'address', 'city', 'createdAt', 'updatedAt'];
  assert.ok(Object.keys(creation).every(key => createAllowed.includes(key)));
  const rules = readFileSync('firestore.rules', 'utf8');
  assert.match(rules, /hasOnly\(\['name', 'phone', 'address', 'city', 'createdAt', 'updatedAt'\]\)/);
  const existing = { loyaltyPoints: 80, admin: true, role: 'admin', patronStatus: 'Existing server tier', phone: '03160000000' };
  const update = emailProfileWrite(user, 'Taha Patron', existing, 5678)!;
  assert.deepEqual(update, { name: 'Taha Patron', updatedAt: 5678 });
  assert.deepEqual({ ...existing, ...update }, { ...existing, name: 'Taha Patron', updatedAt: 5678 });
  assert.equal(emailProfileWrite(user, 'Another name', { ...existing, name: 'Existing customer name' }), null);
  for (const key of ['uid', 'email', 'admin', 'role', 'patronStatus', 'loyaltyPoints', 'wholesaleEligible', 'tier']) {
    assert.equal(key in creation, false);
    assert.equal(key in update, false);
  }
});

test('profile normalization derives identity from Auth and preserves owner contact fields without importing custom claims', () => {
  const identity = { ...user, metadata: { creationTime: '2026-10-03T00:00:00.000Z' } };
  const profile = patronProfileFromIdentity(identity, { uid: 'forged-uid', email: 'forged@example.test', name: 'Saved name',
    phone: '03160000000', address: 'Gulberg III', city: 'Lahore', patronStatus: 'Existing server tier', admin: true });
  assert.equal(profile.uid, user.uid);
  assert.equal(profile.email, user.email);
  assert.equal(profile.name, 'Saved name');
  assert.equal(profile.phone, '03160000000');
  assert.equal(profile.patronStatus, 'Existing server tier');
  assert.equal('admin' in profile, false);
  const fallback = patronProfileFromIdentity(identity);
  assert.equal(fallback.name, user.displayName);
  assert.equal(fallback.email, user.email);
  assert.equal(fallback.createdAt, Date.parse(identity.metadata.creationTime));
});

test('pending guest claim uses authenticated email token and clears recovery keys only after server success', async () => {
  const store = new Map([['pendingOrderId', 'AB-EMAIL-ORDER'], ['pendingClaimToken', 'private-recovery-token']]);
  const storage = { getItem: (key: string) => store.get(key) || null, removeItem: (key: string) => { store.delete(key); } };
  let payload: any;
  const request = async (_path: any, options: any) => { payload = options; return new Response(JSON.stringify({ success: true }), { status: 200 }); };
  const failed = async () => new Response(JSON.stringify({ success: false }), { status: 409 });
  assert.equal(await claimPendingOrder(user, failed as typeof fetch, storage), false);
  assert.equal(store.size, 2);
  assert.equal(await claimPendingOrder(user, request as typeof fetch, storage), true);
  assert.equal(payload.headers.Authorization, 'Bearer verified-email-token');
  assert.deepEqual(JSON.parse(payload.body), { orderId: 'AB-EMAIL-ORDER', claimToken: 'private-recovery-token' });
  assert.equal(store.size, 0);
  assert.equal(await claimPendingOrder(user, request as typeof fetch, null), false);
  assert.equal(await claimPendingOrder(user, request as typeof fetch, { getItem: () => { throw new Error('Storage disabled'); }, removeItem: () => {} }), false);
});

test('website auth surfaces expose no phone/SMS/reCAPTCHA flows or former allowance endpoint', () => {
  const files = ['src/components/AuthModal.tsx', 'src/components/CheckoutAuthChoiceModal.tsx', 'src/lib/emailAuthentication.ts', 'src/contexts/AuthContext.tsx', 'server.ts'];
  const source = files.map(file => readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(source, /signInWithPhoneNumber|PhoneAuthProvider|RecaptchaVerifier|request-otp-allowance|otp_requests|confirmationResult|recaptcha-container/);
  const modal = readFileSync(files[0], 'utf8');
  assert.doesNotMatch(modal, /type=["']tel["']|CodeSlots|SMS|OTP/);
  assert.match(modal, /type="email"/);
  const service = readFileSync(files[2], 'utf8');
  assert.match(service, /signInWithEmailAndPassword/);
  assert.match(service, /createUserWithEmailAndPassword/);
  assert.match(service, /sendPasswordResetEmail/);
  assert.match(source, /hasAdminClaim\(user\)/);
});
