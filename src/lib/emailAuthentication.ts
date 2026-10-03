import { apiUrl } from './apiUrl';
import type { User } from 'firebase/auth';
import type { PatronProfile } from '../contexts/AuthContext';

export type EmailAuthMode = 'signin' | 'signup' | 'forgot_password';
export interface EmailAuthInput { mode: EmailAuthMode; email: string; password?: string; name?: string; confirmPassword?: string }
export interface EmailAuthSdk {
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string) => Promise<User>;
  reset: (email: string) => Promise<void>;
  updateName: (user: User, name: string) => Promise<void>;
}
export class EmailAuthenticationError extends Error {
  constructor(public code: string) { super(code); this.name = 'EmailAuthenticationError'; }
}

/** Match users/{uid} rules without writing identity, permissions, membership or loyalty fields. */
export function emailProfileWrite(user: Pick<User, 'displayName'>, enteredName: string, existing: Record<string, unknown> | null, now = Date.now()): Record<string, string | number> | null {
  const name = enteredName.trim() || user.displayName?.trim() || '';
  if (existing === null) return { name, phone: '', createdAt: now, updatedAt: now };
  if ((typeof existing.name === 'string' && existing.name.trim()) || !name) return null;
  return { name, updatedAt: now };
}

/** Profile contact fields come from Firestore; identity always comes from verified Firebase Auth. */
export function patronProfileFromIdentity(user: Pick<User, 'uid' | 'email' | 'displayName' | 'metadata'>, raw?: Record<string, unknown> | null): PatronProfile {
  const record = raw || {};
  const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
  const authCreatedAt = Date.parse(user.metadata?.creationTime || '');
  return {
    uid: user.uid, email: user.email || '', name: text(record.name) || user.displayName?.trim() || '',
    phone: text(record.phone), address: text(record.address) || undefined, city: text(record.city) || undefined,
    patronStatus: text(record.patronStatus) || 'VIP Patron',
    createdAt: typeof record.createdAt === 'number' && Number.isFinite(record.createdAt) ? record.createdAt : Number.isFinite(authCreatedAt) ? authCreatedAt : 0,
  };
}
export function emailAuthErrorKey(code: unknown): string {
  switch (code) {
    case 'auth/invalid-email': return 'auth.error.email';
    case 'auth/missing-password': return 'auth.error.password';
    case 'auth/weak-password': return 'auth.error.weakPassword';
    case 'auth/missing-name': return 'auth.error.name';
    case 'auth/password-mismatch': return 'auth.error.passwordMismatch';
    case 'auth/email-already-in-use': return 'auth.error.emailExists';
    case 'auth/invalid-credential': case 'auth/invalid-login-credentials': case 'auth/user-not-found': case 'auth/wrong-password': return 'auth.error.credentials';
    case 'auth/user-disabled': return 'auth.error.disabled';
    case 'auth/too-many-requests': return 'auth.error.requests';
    case 'auth/network-request-failed': return 'auth.error.network';
    case 'auth/operation-not-allowed': case 'auth/configuration-not-found': case 'auth/invalid-api-key': return 'auth.error.unavailable';
    default: return 'auth.error.unexpected';
  }
}
async function loadEmailSdk(): Promise<EmailAuthSdk> {
  const [sdk, { auth }] = await Promise.all([import('firebase/auth'), import('./firebaseAuth')]);
  if (!auth) throw new EmailAuthenticationError('auth/configuration-not-found');
  return {
    signIn: async (email, password) => (await sdk.signInWithEmailAndPassword(auth, email, password)).user,
    signUp: async (email, password) => (await sdk.createUserWithEmailAndPassword(auth, email, password)).user,
    reset: email => sdk.sendPasswordResetEmail(auth, email),
    updateName: (user, name) => sdk.updateProfile(user, { displayName: name }),
  };
}
/** Passwords are never trimmed or persisted. Credentials go directly to Firebase Auth. */
export async function authenticateEmail(input: EmailAuthInput, injectedSdk?: EmailAuthSdk): Promise<{ user: User | null; resetSent: boolean }> {
  const email = input.email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new EmailAuthenticationError('auth/invalid-email');
  if (input.mode !== 'forgot_password' && !input.password) throw new EmailAuthenticationError('auth/missing-password');
  const name = (input.name || '').trim();
  if (input.mode === 'signup') {
    if (!name || name.length > 80) throw new EmailAuthenticationError('auth/missing-name');
    if (input.password!.length < 8) throw new EmailAuthenticationError('auth/weak-password');
    if (input.password !== input.confirmPassword) throw new EmailAuthenticationError('auth/password-mismatch');
  }
  const sdk = injectedSdk || await loadEmailSdk();
  if (input.mode === 'forgot_password') {
    try { await sdk.reset(email); } catch (error: any) { if (error?.code !== 'auth/user-not-found') throw error; }
    return { user: null, resetSent: true };
  }
  if (input.mode === 'signup') {
    const user = await sdk.signUp(email, input.password!);
    try { await sdk.updateName(user, name); } catch { /* A display-name failure does not undo verified authentication. */ }
    return { user, resetSent: false };
  }
  return { user: await sdk.signIn(email, input.password!), resetSent: false };
}
function sessionStorageSafely(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.sessionStorage; } catch { return null; }
}
/** Optional services have one deadline covering token retrieval and response parsing. */
async function optionalAuthService<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const deadline = new Promise<never>((_, reject) => {
    controller.signal.addEventListener('abort', () => reject(new EmailAuthenticationError('auth/network-request-failed')), { once: true });
  });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await Promise.race([operation(controller.signal), deadline]); }
  finally { clearTimeout(timer); }
}
/** Retain guest recovery keys until the authenticated server confirms the claim. */
export async function claimPendingOrder(user: Pick<User, 'getIdToken'>, request: typeof fetch = fetch, storage: Pick<Storage, 'getItem' | 'removeItem'> | null = sessionStorageSafely(), timeoutMs = 8000): Promise<boolean> {
  try {
    const orderId = storage?.getItem('pendingOrderId');
    const claimToken = storage?.getItem('pendingClaimToken');
    if (!orderId || !claimToken) return false;
    return await optionalAuthService(async signal => {
      const idToken = await user.getIdToken();
      if (signal.aborted) return false;
      const response = await request(apiUrl('/api/orders/claim'), {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ orderId, claimToken }), signal,
      });
      if (!response.ok || signal.aborted) return false;
      const result = await response.json();
      if (result.success !== true || signal.aborted) return false;
      // Another guest order may have been saved while this claim was in flight.
      if (storage!.getItem('pendingOrderId') === orderId && storage!.getItem('pendingClaimToken') === claimToken) {
        storage!.removeItem('pendingClaimToken'); storage!.removeItem('pendingOrderId');
      }
      return true;
    }, timeoutMs);
  } catch { return false; }
}
export async function completeEmailSignIn(user: User, enteredName = ''): Promise<void> {
  // Optional profile/session services cannot undo verified Firebase email credentials.
  await Promise.allSettled([
    optionalAuthService(async signal => {
      const [{ doc, runTransaction }, { db }] = await Promise.all([import('firebase/firestore'), import('./firebase')]);
      if (signal.aborted) return;
      const ref = doc(db, 'users', user.uid);
      await runTransaction(db, async transaction => {
        const existing = await transaction.get(ref);
        const patch = emailProfileWrite(user, enteredName, existing.exists() ? existing.data() : null);
        if (patch) transaction.set(ref, patch, { merge: true });
      });
    }),
    optionalAuthService(async signal => {
      const idToken = await user.getIdToken();
      if (signal.aborted) return;
      await fetch(apiUrl('/api/auth/sessionLogin'), { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }), signal });
    }),
    claimPendingOrder(user),
  ]);
}
