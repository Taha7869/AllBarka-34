import type { User } from 'firebase/auth';
import type { LanguageCode } from '../contexts/LanguageContext';
import firebaseConfig from '../../firebase-applet-config.json';
import { emailAuthErrorKey } from './emailAuthentication';

export interface GoogleAuthSdk { signIn: (language: LanguageCode) => Promise<User> }
export class GoogleAuthenticationError extends Error {
  constructor(public code: string) { super(code); this.name = 'GoogleAuthenticationError'; }
}
export function googleAuthConfigured(config: { apiKey?: unknown; appId?: unknown; authDomain?: unknown }): boolean {
  return [config.apiKey, config.appId, config.authDomain].every(value => typeof value === 'string' && !!value.trim() && !value.startsWith('your_'));
}
export function googleAuthErrorKey(code: unknown): string {
  switch (code) {
    case 'auth/popup-blocked': return 'auth.error.googlePopupBlocked';
    case 'auth/popup-closed-by-user': case 'auth/cancelled-popup-request': return 'auth.error.googleCancelled';
    case 'auth/account-exists-with-different-credential': case 'auth/credential-already-in-use': return 'auth.error.googleAccountExists';
    case 'auth/unauthorized-domain': case 'auth/operation-not-supported-in-this-environment':
    case 'auth/google-unavailable': case 'auth/configuration-not-found': case 'auth/operation-not-allowed':
    case 'auth/invalid-api-key': case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.': return 'auth.error.googleUnavailable';
    default: return emailAuthErrorKey(code);
  }
}
let preparedSdk: Promise<GoogleAuthSdk> | undefined;

/** Preload while the modal opens so signInWithPopup begins inside the button gesture. */
export function prepareGoogleSignIn(): Promise<GoogleAuthSdk> {
  const environment = (import.meta.env || {}) as Record<string, string | undefined>;
  if (!googleAuthConfigured({
    apiKey: environment.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
    appId: environment.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
    authDomain: environment.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  })) return Promise.reject(new GoogleAuthenticationError('auth/google-unavailable'));
  if (!preparedSdk) preparedSdk = Promise.all([import('firebase/auth'), import('./firebaseAuth')]).then(([sdk, { auth }]) => {
    if (!auth) throw new GoogleAuthenticationError('auth/google-unavailable');
    return {
      signIn: async (language: LanguageCode) => {
        auth.languageCode = language;
        const provider = new sdk.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        // Only the verified Firebase user is returned; Google access tokens are never stored.
        return (await sdk.signInWithPopup(auth, provider)).user;
      },
    };
  }).catch(error => { preparedSdk = undefined; throw error; });
  return preparedSdk;
}

export function authenticateGoogle(language: LanguageCode = 'en', injectedSdk?: GoogleAuthSdk): Promise<User> {
  // The ready adapter executes synchronously up to the popup call, preserving user activation.
  if (injectedSdk) {
    try { return injectedSdk.signIn(language); }
    catch (error) { return Promise.reject(error); }
  }
  return prepareGoogleSignIn().then(sdk => sdk.signIn(language));
}
