import firebaseAppletConfig from '../../firebase-applet-config.json';

export const PRODUCTION_PROJECT_ID = 'allbarka-live';
export const PRODUCTION_STORAGE_BUCKET = 'allbarka-live.firebasestorage.app';
export const PRODUCTION_AUTH_DOMAIN = 'allbarka-live.firebaseapp.com';

export class ConfigurationError extends Error {
  constructor(public code: string, message?: string) {
    super(message || code);
    this.name = 'ConfigurationError';
  }
}

/**
 * Checks whether a given identifier or URL targets the live production environment.
 */
export function isProductionTarget(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === PRODUCTION_PROJECT_ID ||
    normalized === PRODUCTION_STORAGE_BUCKET ||
    normalized === PRODUCTION_AUTH_DOMAIN ||
    normalized.includes('allbarka-live')
  );
}

/**
 * Determines whether the environment is explicitly configured for isolated preview mode.
 */
export function isPreviewEnvironment(env: Record<string, unknown> = {}): boolean {
  const readStr = (val: unknown) => (typeof val === 'string' ? val : '');
  const mode = (
    readStr(env.MODE) ||
    readStr(env.ALLBARKA_MODE) ||
    readStr(env.APP_ENV) ||
    readStr(env.NODE_ENV) ||
    readStr(env.VITE_APP_ENV) ||
    readStr(env.VITE_ALLBARKA_MODE) ||
    readStr(env.VITE_MODE)
  ).trim().toLowerCase();
  if (mode === 'preview') return true;
  const serverProjectId = readStr(env.FIREBASE_PROJECT_ID).trim().toLowerCase();
  if (serverProjectId === 'allbarka-preview' || (serverProjectId.length > 0 && serverProjectId.endsWith('-preview'))) {
    return true;
  }
  const clientProjectId = readStr(env.VITE_FIREBASE_PROJECT_ID).trim().toLowerCase();
  if (clientProjectId === 'allbarka-preview' || (clientProjectId.length > 0 && clientProjectId.endsWith('-preview'))) {
    return true;
  }
  return false;
}

export interface ValidatedPreviewServerConfig {
  projectId: string;
  storageBucket: string;
  firestoreDatabaseId: string;
  clientEmail?: string;
  privateKey?: string;
}

export interface ValidateServerConfigOptions {
  requireCredentials?: boolean;
}

/**
 * Validates server configuration for the isolated preview environment.
 * Rejects production project/bucket targets, mixed configuration, and missing required fields
 * before mutation-capable operations.
 */
export function validatePreviewServerConfig(
  env: Record<string, string | undefined>,
  options: ValidateServerConfigOptions = {}
): ValidatedPreviewServerConfig {
  const projectId = (env.FIREBASE_PROJECT_ID || '').trim();
  if (!projectId) {
    throw new ConfigurationError('PREVIEW_PROJECT_ID_MISSING', 'Preview server configuration requires FIREBASE_PROJECT_ID');
  }
  if (isProductionTarget(projectId)) {
    throw new ConfigurationError('PRODUCTION_TARGET_REJECTED', `Preview server cannot target production project '${projectId}'`);
  }

  // Cross-check with client project ID if present in environment
  const clientProjectId = (env.VITE_FIREBASE_PROJECT_ID || '').trim();
  if (clientProjectId) {
    if (isProductionTarget(clientProjectId)) {
      throw new ConfigurationError('MIXED_CONFIGURATION_DETECTED', `Client VITE_FIREBASE_PROJECT_ID targets production '${clientProjectId}' while server is in preview mode`);
    }
    if (clientProjectId !== projectId) {
      throw new ConfigurationError('MIXED_CONFIGURATION_DETECTED', `Server FIREBASE_PROJECT_ID ('${projectId}') does not match client VITE_FIREBASE_PROJECT_ID ('${clientProjectId}')`);
    }
  }

  const storageBucket = (env.STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET || '').trim();
  if (!storageBucket) {
    throw new ConfigurationError('PREVIEW_STORAGE_BUCKET_MISSING', 'Preview server configuration requires STORAGE_BUCKET; cannot fall back to production');
  }
  if (isProductionTarget(storageBucket)) {
    throw new ConfigurationError('PRODUCTION_TARGET_REJECTED', `Preview server cannot target production bucket '${storageBucket}'`);
  }

  // Cross-check with client storage bucket if present
  const clientBucket = (env.VITE_FIREBASE_STORAGE_BUCKET || '').trim();
  if (clientBucket) {
    if (isProductionTarget(clientBucket)) {
      throw new ConfigurationError('MIXED_CONFIGURATION_DETECTED', `Client VITE_FIREBASE_STORAGE_BUCKET targets production '${clientBucket}'`);
    }
    if (clientBucket !== storageBucket) {
      throw new ConfigurationError('MIXED_CONFIGURATION_DETECTED', `Server STORAGE_BUCKET ('${storageBucket}') does not match client VITE_FIREBASE_STORAGE_BUCKET ('${clientBucket}')`);
    }
  }

  // Cross-check auth domain if present
  const clientAuthDomain = (env.VITE_FIREBASE_AUTH_DOMAIN || '').trim();
  if (clientAuthDomain && isProductionTarget(clientAuthDomain)) {
    throw new ConfigurationError('MIXED_CONFIGURATION_DETECTED', `Client VITE_FIREBASE_AUTH_DOMAIN targets production '${clientAuthDomain}'`);
  }

  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = env.FIREBASE_PRIVATE_KEY?.trim();

  if (options.requireCredentials) {
    if (!clientEmail || !privateKey) {
      throw new ConfigurationError('PREVIEW_CREDENTIALS_MISSING', 'Mutation operations in preview mode require preview FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY');
    }
    if (clientEmail.includes('allbarka-live') || privateKey.includes('allbarka-live')) {
      throw new ConfigurationError('PRODUCTION_TARGET_REJECTED', 'Preview service account credentials cannot belong to allbarka-live');
    }
  }

  const firestoreDatabaseId = (env.FIRESTORE_DATABASE_ID || '(default)').trim();

  return {
    projectId,
    storageBucket,
    firestoreDatabaseId,
    clientEmail,
    privateKey,
  };
}

/**
 * Resolves the upload bucket from validated server configuration.
 * In preview mode, strictly requires non-production bucket configuration and fails closed if invalid.
 * In production mode, falls back to STORAGE_BUCKET, FIREBASE_STORAGE_BUCKET, or firebaseAppletConfig.
 */
export function resolveStorageBucket(env: Record<string, string | undefined> = process.env): string {
  if (isPreviewEnvironment(env)) {
    const validated = validatePreviewServerConfig(env, { requireCredentials: false });
    return validated.storageBucket;
  }
  return (
    env.STORAGE_BUCKET?.trim() ||
    env.FIREBASE_STORAGE_BUCKET?.trim() ||
    firebaseAppletConfig.storageBucket ||
    ''
  );
}

export interface FirebaseClientAppConfig {
  projectId: string;
  appId?: string;
  apiKey?: string;
  authDomain: string;
  storageBucket: string;
  messagingSenderId?: string;
  measurementId?: string;
  firestoreDatabaseId: string;
}

/**
 * Resolves Firebase Web SDK client configuration.
 * In preview mode: strictly requires complete and isolated preview configuration without falling back to production JSON.
 * In production/default mode: falls back to firebase-applet-config.json.
 */
export function resolveFirebaseClientConfig(
  rawEnv?: Record<string, unknown>
): FirebaseClientAppConfig {
  const env: Record<string, unknown> =
    rawEnv ||
    (typeof process !== 'undefined' && process.env
      ? (process.env as Record<string, unknown>)
      : {});

  const readStr = (val: unknown) => (typeof val === 'string' ? val : '');
  const isPreview = isPreviewEnvironment(env);

  if (isPreview) {
    const projectId = readStr(env.VITE_FIREBASE_PROJECT_ID).trim();
    if (!projectId) {
      throw new ConfigurationError('PREVIEW_CLIENT_PROJECT_ID_MISSING', 'Preview client requires VITE_FIREBASE_PROJECT_ID');
    }
    if (isProductionTarget(projectId)) {
      throw new ConfigurationError('PRODUCTION_TARGET_REJECTED', `Preview client cannot target production project '${projectId}'`);
    }

    const storageBucket = readStr(env.VITE_FIREBASE_STORAGE_BUCKET).trim();
    if (!storageBucket) {
      throw new ConfigurationError('PREVIEW_CLIENT_STORAGE_BUCKET_MISSING', 'Preview client requires VITE_FIREBASE_STORAGE_BUCKET; cannot fall back to production');
    }
    if (isProductionTarget(storageBucket)) {
      throw new ConfigurationError('PRODUCTION_TARGET_REJECTED', `Preview client cannot target production bucket '${storageBucket}'`);
    }

    const authDomain = readStr(env.VITE_FIREBASE_AUTH_DOMAIN).trim();
    if (!authDomain) {
      throw new ConfigurationError('PREVIEW_CLIENT_AUTH_DOMAIN_MISSING', 'Preview client requires VITE_FIREBASE_AUTH_DOMAIN; cannot fall back to production');
    }
    if (isProductionTarget(authDomain)) {
      throw new ConfigurationError('PRODUCTION_TARGET_REJECTED', `Preview client cannot target production authDomain '${authDomain}'`);
    }

    const apiKey = readStr(env.VITE_FIREBASE_API_KEY).trim();
    if (!apiKey || apiKey.startsWith('your_')) {
      throw new ConfigurationError('PREVIEW_CLIENT_API_KEY_MISSING', 'Preview client requires VITE_FIREBASE_API_KEY for authentication; cannot fall back to production');
    }
    if (isProductionTarget(apiKey)) {
      throw new ConfigurationError('PRODUCTION_TARGET_REJECTED', 'Preview client cannot use production API key');
    }

    const appId = readStr(env.VITE_FIREBASE_APP_ID).trim();
    if (!appId || appId.startsWith('your_')) {
      throw new ConfigurationError('PREVIEW_CLIENT_APP_ID_MISSING', 'Preview client requires VITE_FIREBASE_APP_ID for authentication; cannot fall back to production');
    }
    if (isProductionTarget(appId)) {
      throw new ConfigurationError('PRODUCTION_TARGET_REJECTED', 'Preview client cannot use production App ID');
    }

    const messagingSenderId = readStr(env.VITE_FIREBASE_MESSAGING_SENDER_ID).trim() || undefined;
    if (messagingSenderId && isProductionTarget(messagingSenderId)) {
      throw new ConfigurationError('PRODUCTION_TARGET_REJECTED', 'Preview client cannot target production messagingSenderId');
    }

    const measurementId = readStr(env.VITE_FIREBASE_MEASUREMENT_ID).trim() || undefined;
    if (measurementId && isProductionTarget(measurementId)) {
      throw new ConfigurationError('PRODUCTION_TARGET_REJECTED', 'Preview client cannot target production measurementId');
    }

    const firestoreDatabaseId = readStr(env.VITE_FIRESTORE_DATABASE_ID).trim() || '(default)';
    if (firestoreDatabaseId && isProductionTarget(firestoreDatabaseId)) {
      throw new ConfigurationError('PRODUCTION_TARGET_REJECTED', 'Preview client cannot target production database ID');
    }

    return {
      projectId,
      storageBucket,
      authDomain,
      apiKey,
      appId,
      messagingSenderId,
      measurementId,
      firestoreDatabaseId,
    };
  }

  // Standard production / default behavior (preserves backward compatibility)
  return {
    projectId: readStr(env.VITE_FIREBASE_PROJECT_ID).trim() || firebaseAppletConfig.projectId || 'allbarka-live',
    appId: readStr(env.VITE_FIREBASE_APP_ID).trim() || firebaseAppletConfig.appId,
    apiKey: readStr(env.VITE_FIREBASE_API_KEY).trim() || firebaseAppletConfig.apiKey,
    authDomain: readStr(env.VITE_FIREBASE_AUTH_DOMAIN).trim() || firebaseAppletConfig.authDomain || 'allbarka-live.firebaseapp.com',
    storageBucket: readStr(env.VITE_FIREBASE_STORAGE_BUCKET).trim() || firebaseAppletConfig.storageBucket || 'allbarka-live.firebasestorage.app',
    messagingSenderId: readStr(env.VITE_FIREBASE_MESSAGING_SENDER_ID).trim() || firebaseAppletConfig.messagingSenderId,
    measurementId: readStr(env.VITE_FIREBASE_MEASUREMENT_ID).trim() || firebaseAppletConfig.measurementId,
    firestoreDatabaseId: readStr(env.VITE_FIRESTORE_DATABASE_ID).trim() || firebaseAppletConfig.firestoreDatabaseId || '(default)',
  };
}
