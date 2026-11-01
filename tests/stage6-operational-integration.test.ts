import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import vm from 'node:vm';
import path from 'node:path';
import { build as viteBuild } from 'vite';
import { memoryFirestore } from './helpers/memoryFirestore';
import { staffFixtureIdentity, staffFixtureOrder } from './helpers/staffFixtures';
import { requireCurrentAdministrator } from '../src/lib/adminAuthentication';
import { createCatalogRouter } from '../src/lib/catalogRouter';
import { createCatalogConfigurationRouter } from '../src/lib/catalogConfigurationRouter';
import { createProductUploadRouter, MAX_UPLOAD_BYTES } from '../src/lib/productUploadRouter';
import { createProductMediaRouter } from '../src/lib/productMediaRouter';
import { createStaffRouter, assertStaffReader, changeStaffAccess } from '../src/lib/staffAccess';
import { createInquiriesRouter } from '../src/lib/inquiriesRouter';
import { HAMPER_BOXES } from '../src/lib/hamperCatalog';
import { validateAndPriceOrder } from '../src/lib/orderValidation';
import { DEFAULT_CATALOG_CONFIGURATION } from '../src/lib/catalogConfiguration';
import { googleAuthConfigured } from '../src/lib/googleAuthentication';
import {
  isPreviewEnvironment,
  validatePreviewServerConfig,
  resolveStorageBucket,
  resolveFirebaseClientConfig,
  ConfigurationError,
} from '../src/lib/environmentConfig';
import type { Product } from '../src/types';

const PNG_BUFFER = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQ1sAAAAASUVORK5CYII=', 'base64');

// ============================================================================
// STAGE 6: RUNTIME PREVIEW ISOLATION & OPERATIONAL INTEGRATION VERIFICATION
// Note: Verification below uses isolated local fixtures (memoryFirestore and mock identity).
// Real Firebase Cloud provider verification remains explicitly BLOCKED until an isolated
// target GCP/Firebase project ('allbarka-preview') is provisioned with active credentials.
// ============================================================================

test('Stage 6 [Local Fixture]: Runtime preview configuration validation and safety invariants against production pollution', async () => {
  // ===========================================================================
  // 1. Complete isolated preview configuration succeeds
  // ===========================================================================
  const validPreviewEnv = {
    ALLBARKA_MODE: 'preview',
    FIREBASE_PROJECT_ID: 'allbarka-preview',
    STORAGE_BUCKET: 'allbarka-preview.firebasestorage.app',
    VITE_FIREBASE_PROJECT_ID: 'allbarka-preview',
    VITE_FIREBASE_STORAGE_BUCKET: 'allbarka-preview.firebasestorage.app',
    VITE_FIREBASE_AUTH_DOMAIN: 'allbarka-preview.firebaseapp.com',
    VITE_FIREBASE_API_KEY: 'AIzaSyPreviewTestKey012345678901234',
    VITE_FIREBASE_APP_ID: '1:123456789012:web:abcdef123456',
    FIREBASE_CLIENT_EMAIL: 'preview-admin-sa@allbarka-preview.iam.gserviceaccount.com',
    FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD...',
  };

  assert.equal(isPreviewEnvironment(validPreviewEnv), true, 'Identifies preview mode from ALLBARKA_MODE');
  const serverConfig = validatePreviewServerConfig(validPreviewEnv, { requireCredentials: true });
  assert.equal(serverConfig.projectId, 'allbarka-preview');
  assert.equal(serverConfig.storageBucket, 'allbarka-preview.firebasestorage.app');
  assert.equal(resolveStorageBucket(validPreviewEnv), 'allbarka-preview.firebasestorage.app');

  const clientConfig = resolveFirebaseClientConfig(validPreviewEnv);
  assert.equal(clientConfig.projectId, 'allbarka-preview');
  assert.equal(clientConfig.storageBucket, 'allbarka-preview.firebasestorage.app');
  assert.equal(clientConfig.authDomain, 'allbarka-preview.firebaseapp.com');
  assert.equal(clientConfig.apiKey, 'AIzaSyPreviewTestKey012345678901234');
  assert.equal(clientConfig.appId, '1:123456789012:web:abcdef123456');

  // ===========================================================================
  // 2. Missing, mixed or production-targeted preview configuration fails before mutation calls
  // ===========================================================================
  // 2a. Rejection of production project and bucket targets in preview mode
  assert.throws(
    () => validatePreviewServerConfig({ ALLBARKA_MODE: 'preview', FIREBASE_PROJECT_ID: 'allbarka-live', STORAGE_BUCKET: 'allbarka-preview.firebasestorage.app' }),
    (err: any) => err instanceof ConfigurationError && err.code === 'PRODUCTION_TARGET_REJECTED',
    'Rejects production project ID in preview mode'
  );
  assert.throws(
    () => validatePreviewServerConfig({ ALLBARKA_MODE: 'preview', FIREBASE_PROJECT_ID: 'allbarka-preview', STORAGE_BUCKET: 'allbarka-live.firebasestorage.app' }),
    (err: any) => err instanceof ConfigurationError && err.code === 'PRODUCTION_TARGET_REJECTED',
    'Rejects production storage bucket in preview mode'
  );

  // 2b. Rejection of mixed client/server configurations
  assert.throws(
    () => validatePreviewServerConfig({
      ALLBARKA_MODE: 'preview',
      FIREBASE_PROJECT_ID: 'allbarka-preview',
      STORAGE_BUCKET: 'allbarka-preview.firebasestorage.app',
      VITE_FIREBASE_PROJECT_ID: 'allbarka-live',
    }),
    (err: any) => err instanceof ConfigurationError && err.code === 'MIXED_CONFIGURATION_DETECTED',
    'Rejects client pointing to production while server is in preview'
  );
  assert.throws(
    () => validatePreviewServerConfig({
      ALLBARKA_MODE: 'preview',
      FIREBASE_PROJECT_ID: 'allbarka-preview',
      STORAGE_BUCKET: 'allbarka-preview.firebasestorage.app',
      VITE_FIREBASE_STORAGE_BUCKET: 'allbarka-live.firebasestorage.app',
    }),
    (err: any) => err instanceof ConfigurationError && err.code === 'MIXED_CONFIGURATION_DETECTED',
    'Rejects client storage pointing to production'
  );
  assert.throws(
    () => validatePreviewServerConfig({
      ALLBARKA_MODE: 'preview',
      FIREBASE_PROJECT_ID: 'allbarka-preview',
      STORAGE_BUCKET: 'allbarka-preview.firebasestorage.app',
      VITE_FIREBASE_AUTH_DOMAIN: 'allbarka-live.firebaseapp.com',
    }),
    (err: any) => err instanceof ConfigurationError && err.code === 'MIXED_CONFIGURATION_DETECTED',
    'Rejects client authDomain pointing to production'
  );

  // 2c. Rejection of missing required fields in preview mode
  assert.throws(
    () => validatePreviewServerConfig({ ALLBARKA_MODE: 'preview', FIREBASE_PROJECT_ID: 'allbarka-preview' }),
    (err: any) => err instanceof ConfigurationError && err.code === 'PREVIEW_STORAGE_BUCKET_MISSING',
    'Fails when STORAGE_BUCKET is omitted in preview mode'
  );
  assert.throws(
    () => validatePreviewServerConfig({ ALLBARKA_MODE: 'preview', STORAGE_BUCKET: 'allbarka-preview.firebasestorage.app' }),
    (err: any) => err instanceof ConfigurationError && err.code === 'PREVIEW_PROJECT_ID_MISSING',
    'Fails when FIREBASE_PROJECT_ID is omitted in preview mode'
  );
  assert.throws(
    () => validatePreviewServerConfig({ ALLBARKA_MODE: 'preview', FIREBASE_PROJECT_ID: 'allbarka-preview', STORAGE_BUCKET: 'allbarka-preview.firebasestorage.app' }, { requireCredentials: true }),
    (err: any) => err instanceof ConfigurationError && err.code === 'PREVIEW_CREDENTIALS_MISSING',
    'Fails when mutation credentials are required but missing'
  );

  // 2d. Browser-shaped environments containing MODE and VITE_* fields only (no ALLBARKA_MODE)
  // 2d-i. Valid browser preview with unique project ID (such as allbarka-preview-123)
  const browserPreviewEnv = {
    MODE: 'preview',
    BASE_URL: '/',
    PROD: false,
    DEV: false,
    VITE_FIREBASE_PROJECT_ID: 'allbarka-preview-123',
    VITE_FIREBASE_STORAGE_BUCKET: 'allbarka-preview-123.firebasestorage.app',
    VITE_FIREBASE_AUTH_DOMAIN: 'allbarka-preview-123.firebaseapp.com',
    VITE_FIREBASE_API_KEY: 'AIzaSyPreviewKey123456789',
    VITE_FIREBASE_APP_ID: '1:123456:web:preview123',
  };
  assert.equal(isPreviewEnvironment(browserPreviewEnv), true, 'Recognizes actual Vite preview mode independently of project naming');
  const resolvedBrowserConfig = resolveFirebaseClientConfig(browserPreviewEnv);
  assert.equal(resolvedBrowserConfig.projectId, 'allbarka-preview-123');
  assert.equal(resolvedBrowserConfig.storageBucket, 'allbarka-preview-123.firebasestorage.app');
  assert.equal(resolvedBrowserConfig.authDomain, 'allbarka-preview-123.firebaseapp.com');
  assert.equal(resolvedBrowserConfig.apiKey, 'AIzaSyPreviewKey123456789');
  assert.equal(resolvedBrowserConfig.appId, '1:123456:web:preview123');
  assert.equal(googleAuthConfigured(resolvedBrowserConfig), true, 'Google auth recognizes complete resolved preview SDK configuration');

  // 2d-ii. Missing required preview auth SDK fields throw without falling back to production JSON
  assert.throws(
    () => resolveFirebaseClientConfig({
      MODE: 'preview',
      VITE_FIREBASE_STORAGE_BUCKET: 'allbarka-preview-123.firebasestorage.app',
      VITE_FIREBASE_AUTH_DOMAIN: 'allbarka-preview-123.firebaseapp.com',
      VITE_FIREBASE_API_KEY: 'AIzaSyPreviewKey123456789',
      VITE_FIREBASE_APP_ID: '1:123456:web:preview123',
    }),
    (err: any) => err instanceof ConfigurationError && err.code === 'PREVIEW_CLIENT_PROJECT_ID_MISSING',
    'Throws when VITE_FIREBASE_PROJECT_ID is missing in browser preview'
  );
  assert.throws(
    () => resolveFirebaseClientConfig({
      MODE: 'preview',
      VITE_FIREBASE_PROJECT_ID: 'allbarka-preview-123',
      VITE_FIREBASE_AUTH_DOMAIN: 'allbarka-preview-123.firebaseapp.com',
      VITE_FIREBASE_API_KEY: 'AIzaSyPreviewKey123456789',
      VITE_FIREBASE_APP_ID: '1:123456:web:preview123',
    }),
    (err: any) => err instanceof ConfigurationError && err.code === 'PREVIEW_CLIENT_STORAGE_BUCKET_MISSING',
    'Throws when VITE_FIREBASE_STORAGE_BUCKET is missing in browser preview'
  );
  assert.throws(
    () => resolveFirebaseClientConfig({
      MODE: 'preview',
      VITE_FIREBASE_PROJECT_ID: 'allbarka-preview-123',
      VITE_FIREBASE_STORAGE_BUCKET: 'allbarka-preview-123.firebasestorage.app',
      VITE_FIREBASE_API_KEY: 'AIzaSyPreviewKey123456789',
      VITE_FIREBASE_APP_ID: '1:123456:web:preview123',
    }),
    (err: any) => err instanceof ConfigurationError && err.code === 'PREVIEW_CLIENT_AUTH_DOMAIN_MISSING',
    'Throws when VITE_FIREBASE_AUTH_DOMAIN is missing in browser preview'
  );
  assert.throws(
    () => resolveFirebaseClientConfig({
      MODE: 'preview',
      VITE_FIREBASE_PROJECT_ID: 'allbarka-preview-123',
      VITE_FIREBASE_STORAGE_BUCKET: 'allbarka-preview-123.firebasestorage.app',
      VITE_FIREBASE_AUTH_DOMAIN: 'allbarka-preview-123.firebaseapp.com',
      VITE_FIREBASE_APP_ID: '1:123456:web:preview123',
    }),
    (err: any) => err instanceof ConfigurationError && err.code === 'PREVIEW_CLIENT_API_KEY_MISSING',
    'Throws when VITE_FIREBASE_API_KEY is missing in browser preview'
  );
  assert.throws(
    () => resolveFirebaseClientConfig({
      MODE: 'preview',
      VITE_FIREBASE_PROJECT_ID: 'allbarka-preview-123',
      VITE_FIREBASE_STORAGE_BUCKET: 'allbarka-preview-123.firebasestorage.app',
      VITE_FIREBASE_AUTH_DOMAIN: 'allbarka-preview-123.firebaseapp.com',
      VITE_FIREBASE_API_KEY: 'your_api_key_here',
      VITE_FIREBASE_APP_ID: '1:123456:web:preview123',
    }),
    (err: any) => err instanceof ConfigurationError && err.code === 'PREVIEW_CLIENT_API_KEY_MISSING',
    'Throws when VITE_FIREBASE_API_KEY is placeholder in browser preview'
  );
  assert.throws(
    () => resolveFirebaseClientConfig({
      MODE: 'preview',
      VITE_FIREBASE_PROJECT_ID: 'allbarka-preview-123',
      VITE_FIREBASE_STORAGE_BUCKET: 'allbarka-preview-123.firebasestorage.app',
      VITE_FIREBASE_AUTH_DOMAIN: 'allbarka-preview-123.firebaseapp.com',
      VITE_FIREBASE_API_KEY: 'AIzaSyPreviewKey123456789',
    }),
    (err: any) => err instanceof ConfigurationError && err.code === 'PREVIEW_CLIENT_APP_ID_MISSING',
    'Throws when VITE_FIREBASE_APP_ID is missing in browser preview'
  );
  assert.throws(
    () => resolveFirebaseClientConfig({
      MODE: 'preview',
      VITE_FIREBASE_PROJECT_ID: 'allbarka-preview-123',
      VITE_FIREBASE_STORAGE_BUCKET: 'allbarka-preview-123.firebasestorage.app',
      VITE_FIREBASE_AUTH_DOMAIN: 'allbarka-preview-123.firebaseapp.com',
      VITE_FIREBASE_API_KEY: 'AIzaSyPreviewKey123456789',
      VITE_FIREBASE_APP_ID: 'your_app_id_here',
    }),
    (err: any) => err instanceof ConfigurationError && err.code === 'PREVIEW_CLIENT_APP_ID_MISSING',
    'Throws when VITE_FIREBASE_APP_ID is placeholder in browser preview'
  );

  // 2d-iii. Accidental production targets in browser preview fail closed
  assert.throws(
    () => resolveFirebaseClientConfig({
      MODE: 'preview',
      VITE_FIREBASE_PROJECT_ID: 'allbarka-live',
      VITE_FIREBASE_STORAGE_BUCKET: 'allbarka-preview-123.firebasestorage.app',
      VITE_FIREBASE_AUTH_DOMAIN: 'allbarka-preview-123.firebaseapp.com',
      VITE_FIREBASE_API_KEY: 'AIzaSyPreviewKey123456789',
      VITE_FIREBASE_APP_ID: '1:123456:web:preview123',
    }),
    (err: any) => err instanceof ConfigurationError && err.code === 'PRODUCTION_TARGET_REJECTED',
    'Rejects production project ID in browser preview'
  );
  assert.throws(
    () => resolveFirebaseClientConfig({
      MODE: 'preview',
      VITE_FIREBASE_PROJECT_ID: 'allbarka-preview-123',
      VITE_FIREBASE_STORAGE_BUCKET: 'allbarka-live.firebasestorage.app',
      VITE_FIREBASE_AUTH_DOMAIN: 'allbarka-preview-123.firebaseapp.com',
      VITE_FIREBASE_API_KEY: 'AIzaSyPreviewKey123456789',
      VITE_FIREBASE_APP_ID: '1:123456:web:preview123',
    }),
    (err: any) => err instanceof ConfigurationError && err.code === 'PRODUCTION_TARGET_REJECTED',
    'Rejects production storage bucket in browser preview'
  );
  assert.throws(
    () => resolveFirebaseClientConfig({
      MODE: 'preview',
      VITE_FIREBASE_PROJECT_ID: 'allbarka-preview-123',
      VITE_FIREBASE_STORAGE_BUCKET: 'allbarka-preview-123.firebasestorage.app',
      VITE_FIREBASE_AUTH_DOMAIN: 'allbarka-live.firebaseapp.com',
      VITE_FIREBASE_API_KEY: 'AIzaSyPreviewKey123456789',
      VITE_FIREBASE_APP_ID: '1:123456:web:preview123',
    }),
    (err: any) => err instanceof ConfigurationError && err.code === 'PRODUCTION_TARGET_REJECTED',
    'Rejects production auth domain in browser preview'
  );
  assert.throws(
    () => resolveFirebaseClientConfig({
      MODE: 'preview',
      VITE_FIREBASE_PROJECT_ID: 'allbarka-preview-123',
      VITE_FIREBASE_STORAGE_BUCKET: 'allbarka-preview-123.firebasestorage.app',
      VITE_FIREBASE_AUTH_DOMAIN: 'allbarka-preview-123.firebaseapp.com',
      VITE_FIREBASE_API_KEY: 'AIzaSy_allbarka-live_key',
      VITE_FIREBASE_APP_ID: '1:123456:web:preview123',
    }),
    (err: any) => err instanceof ConfigurationError && err.code === 'PRODUCTION_TARGET_REJECTED',
    'Rejects production API key in browser preview'
  );
  assert.throws(
    () => resolveFirebaseClientConfig({
      MODE: 'preview',
      VITE_FIREBASE_PROJECT_ID: 'allbarka-preview-123',
      VITE_FIREBASE_STORAGE_BUCKET: 'allbarka-preview-123.firebasestorage.app',
      VITE_FIREBASE_AUTH_DOMAIN: 'allbarka-preview-123.firebaseapp.com',
      VITE_FIREBASE_API_KEY: 'AIzaSyPreviewKey123456789',
      VITE_FIREBASE_APP_ID: '1:allbarka-live:web:preview123',
    }),
    (err: any) => err instanceof ConfigurationError && err.code === 'PRODUCTION_TARGET_REJECTED',
    'Rejects production App ID in browser preview'
  );

  // 2d-iv. Production browser environment preserves backwards compatibility
  const browserProdEnv = {
    MODE: 'production',
    BASE_URL: '/',
    PROD: true,
    DEV: false,
  };
  assert.equal(isPreviewEnvironment(browserProdEnv), false, 'Production browser environment is not preview');
  const prodConfig = resolveFirebaseClientConfig(browserProdEnv);
  assert.equal(prodConfig.projectId, 'allbarka-live', 'Preserves production project ID from applet config');
  assert.equal(prodConfig.authDomain, 'allbarka-live.firebaseapp.com');
  assert.equal(prodConfig.storageBucket, 'allbarka-live.firebasestorage.app');

  // 2e. Actual Vite preview-mode transform/build verification
  const envConfigModulePath = path.resolve('src/lib/environmentConfig.ts').replace(/\\/g, '/');
  const viteEntrySource = `
    import { resolveFirebaseClientConfig } from '${envConfigModulePath}';
    globalThis.__vite_preview_result = resolveFirebaseClientConfig(import.meta.env);
  `;

  const origEnvSnapshot = { ...process.env };
  try {
    // 2e-i. Actual Vite preview build with unique project ID succeeds and resolves without production fallback
    process.env.VITE_FIREBASE_PROJECT_ID = 'allbarka-preview-unique-789';
    process.env.VITE_FIREBASE_API_KEY = 'AIzaSyPreviewKey789';
    process.env.VITE_FIREBASE_AUTH_DOMAIN = 'allbarka-preview-unique-789.firebaseapp.com';
    process.env.VITE_FIREBASE_APP_ID = '1:789:web:preview789';
    process.env.VITE_FIREBASE_STORAGE_BUCKET = 'allbarka-preview-unique-789.firebasestorage.app';

    const vitePreviewBuild: any = await viteBuild({
      root: process.cwd(),
      mode: 'preview',
      build: {
        write: false,
        rollupOptions: {
          input: 'virtual:vite-entry',
          plugins: [
            {
              name: 'virtual-vite-entry',
              resolveId(id) { if (id === 'virtual:vite-entry') return id; },
              load(id) { if (id === 'virtual:vite-entry') return viteEntrySource; }
            }
          ]
        }
      }
    });

    const transformedCode1 = (Array.isArray(vitePreviewBuild) ? vitePreviewBuild[0] : vitePreviewBuild).output[0].code;
    const sandbox1 = { globalThis: {} as any };
    vm.createContext(sandbox1);
    vm.runInContext(transformedCode1, sandbox1);
    const buildResult1 = sandbox1.globalThis.__vite_preview_result;
    assert.ok(buildResult1, 'Actual Vite preview build executes successfully in sandbox');
    assert.equal(buildResult1.projectId, 'allbarka-preview-unique-789');
    assert.equal(buildResult1.storageBucket, 'allbarka-preview-unique-789.firebasestorage.app');
    assert.equal(buildResult1.authDomain, 'allbarka-preview-unique-789.firebaseapp.com');
    assert.equal(buildResult1.apiKey, 'AIzaSyPreviewKey789');
    assert.equal(buildResult1.appId, '1:789:web:preview789');

    // 2e-ii. Actual Vite preview build with incomplete configuration throws and fails closed
    delete process.env.VITE_FIREBASE_API_KEY;
    const viteIncompleteBuild: any = await viteBuild({
      root: process.cwd(),
      mode: 'preview',
      build: {
        write: false,
        rollupOptions: {
          input: 'virtual:vite-entry',
          plugins: [
            {
              name: 'virtual-vite-entry',
              resolveId(id) { if (id === 'virtual:vite-entry') return id; },
              load(id) { if (id === 'virtual:vite-entry') return viteEntrySource; }
            }
          ]
        }
      }
    });
    const transformedCode2 = (Array.isArray(viteIncompleteBuild) ? viteIncompleteBuild[0] : viteIncompleteBuild).output[0].code;
    const sandbox2 = { globalThis: {} as any };
    vm.createContext(sandbox2);
    assert.throws(
      () => vm.runInContext(transformedCode2, sandbox2),
      (err: any) => err.name === 'ConfigurationError' && err.code === 'PREVIEW_CLIENT_API_KEY_MISSING',
      'Actual Vite preview build fails closed on missing API key'
    );

    // 2e-iii. Actual Vite preview build with accidental production target throws and fails closed
    process.env.VITE_FIREBASE_API_KEY = 'AIzaSyPreviewKey789';
    process.env.VITE_FIREBASE_PROJECT_ID = 'allbarka-live';
    const viteProductionTargetBuild: any = await viteBuild({
      root: process.cwd(),
      mode: 'preview',
      build: {
        write: false,
        rollupOptions: {
          input: 'virtual:vite-entry',
          plugins: [
            {
              name: 'virtual-vite-entry',
              resolveId(id) { if (id === 'virtual:vite-entry') return id; },
              load(id) { if (id === 'virtual:vite-entry') return viteEntrySource; }
            }
          ]
        }
      }
    });
    const transformedCode3 = (Array.isArray(viteProductionTargetBuild) ? viteProductionTargetBuild[0] : viteProductionTargetBuild).output[0].code;
    const sandbox3 = { globalThis: {} as any };
    vm.createContext(sandbox3);
    assert.throws(
      () => vm.runInContext(transformedCode3, sandbox3),
      (err: any) => err.name === 'ConfigurationError' && err.code === 'PRODUCTION_TARGET_REJECTED',
      'Actual Vite preview build rejects accidental production target'
    );
  } finally {
    process.env = origEnvSnapshot;
  }

  // ===========================================================================
  // 3. Upload wiring receives intended preview bucket
  // ===========================================================================
  assert.equal(resolveStorageBucket(validPreviewEnv), 'allbarka-preview.firebasestorage.app');
  let wiredBucketName = '';
  const uploadApp = express();
  uploadApp.use(createProductUploadRouter({
    requireAdmin: (_req, _res, next) => next(),
    getBucket: () => {
      wiredBucketName = resolveStorageBucket(validPreviewEnv);
      return {
        name: wiredBucketName,
        file: () => ({ save: async () => {} }),
      } as any;
    },
  }));
  const uploadServer = uploadApp.listen(0, '127.0.0.1');
  await once(uploadServer, 'listening');
  const uploadPort = (uploadServer.address() as any).port;
  try {
    const res = await fetch(`http://127.0.0.1:${uploadPort}/api/admin/catalog/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: PNG_BUFFER,
    });
    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(wiredBucketName, 'allbarka-preview.firebasestorage.app');
    assert.match(json.url, /https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/allbarka-preview\.firebasestorage\.app\//);
  } finally {
    uploadServer.close();
  }

  // ===========================================================================
  // 4. Existing production configuration remains compatible
  // ===========================================================================
  assert.equal(resolveStorageBucket({}), 'allbarka-live.firebasestorage.app');
  const defaultClientConfig = resolveFirebaseClientConfig({});
  assert.equal(defaultClientConfig.projectId, 'allbarka-live');
  assert.equal(defaultClientConfig.authDomain, 'allbarka-live.firebaseapp.com');
  assert.equal(defaultClientConfig.storageBucket, 'allbarka-live.firebasestorage.app');

  // ===========================================================================
  // 5. Correct staff records are accepted; incomplete records remain denied
  // ===========================================================================
  const { auth: mockAuth, users } = staffFixtureIdentity();
  users.set('test-staff-uid', {
    uid: 'test-staff-uid',
    email: 'test-staff@allbarka.test',
    emailVerified: true,
    disabled: false,
    customClaims: { role: 'staff' },
  });

  const { db: staffDb, records } = memoryFirestore({
    'staffAccess/test-staff-uid': {
      version: 1,
      uid: 'test-staff-uid',
      enabled: true,
      revision: 1,
    },
  });

  // Valid staff record with version: 1 passes
  await assert.doesNotReject(
    () => assertStaffReader(staffDb, mockAuth, { uid: 'test-staff-uid', auth_time: Math.floor(Date.now() / 1000) }),
    'Complete staff record with version: 1 is accepted'
  );

  // Incomplete record missing version: 1 is denied
  records.set('staffAccess/test-staff-uid', {
    uid: 'test-staff-uid',
    enabled: true,
    revision: 1,
  });
  await assert.rejects(
    () => assertStaffReader(staffDb, mockAuth, { uid: 'test-staff-uid', auth_time: Math.floor(Date.now() / 1000) }),
    (err: any) => err.code === 'STAFF_ACCESS_DENIED' && err.status === 403,
    'Incomplete record missing version: 1 is denied'
  );

  // Incomplete record with enabled: false is denied
  records.set('staffAccess/test-staff-uid', {
    version: 1,
    uid: 'test-staff-uid',
    enabled: false,
    revision: 1,
  });
  await assert.rejects(
    () => assertStaffReader(staffDb, mockAuth, { uid: 'test-staff-uid', auth_time: Math.floor(Date.now() / 1000) }),
    (err: any) => err.code === 'STAFF_ACCESS_DENIED' && err.status === 403,
    'Disabled staff record is denied'
  );

  // Admin workflow creates canonical version: 1 record
  users.set('admin-actor', {
    uid: 'admin-actor',
    email: 'admin@allbarka.test',
    emailVerified: true,
    disabled: false,
    customClaims: { admin: true },
  });
  records.delete('staffAccess/test-staff-uid');
  const granted = await changeStaffAccess({
    db: staffDb,
    auth: mockAuth,
    claims: { uid: 'admin-actor', auth_time: Math.floor(Date.now() / 1000) },
    targetUid: 'test-staff-uid',
    body: { enabled: true, expectedRevision: 0 },
  });
  assert.equal(granted.enabled, true);
  assert.equal(granted.revision, 1);
  const storedStaff = records.get('staffAccess/test-staff-uid') as any;
  assert.equal(storedStaff.version, 1, 'Admin workflow sets version: 1');
  assert.equal(storedStaff.enabled, true);
});

test('Stage 6 Operational Journey [Local Fixture Evidence]: Complete 10-step admin and customer verification', async () => {
  const initialConfiguration = structuredClone(DEFAULT_CATALOG_CONFIGURATION);
  initialConfiguration.taxonomy.push({
    id: 'preview-dry-fruits',
    type: 'category',
    name_en: 'Preview Dry Fruits',
    name_ur: 'ٹیسٹ ڈرائی فروٹس',
    name_ar: 'فواكه مجففة تجريبية',
    description_en: 'Preview Category',
    description_ur: '',
    description_ar: '',
    visible: true,
  });

  const { db, records } = memoryFirestore({
    'catalogSettings/main': initialConfiguration,
    'orders/ORD-PREVIEW-001': {
      ...staffFixtureOrder(),
      id: 'ORD-PREVIEW-001',
      orderId: 'ORD-PREVIEW-001',
      secretSupplierNotes: 'SENSITIVE_SUPPLIER_INFO_DO_NOT_LEAK',
    },
    'staffAccess/preview-staff-uid': {
      uid: 'preview-staff-uid',
      version: 1,
      enabled: true,
      revision: 1,
    },
  });

  const { auth, users } = staffFixtureIdentity();

  // Provision dedicated test users in mock auth
  users.set('preview-admin-uid', {
    uid: 'preview-admin-uid',
    email: 'preview-admin@allbarka.test',
    emailVerified: true,
    disabled: false,
    customClaims: { admin: true, role: 'admin' },
    tokensValidAfterTime: new Date(Date.now() - 3600000).toISOString(),
  });

  users.set('preview-staff-uid', {
    uid: 'preview-staff-uid',
    email: 'preview-staff@allbarka.test',
    emailVerified: true,
    disabled: false,
    customClaims: { role: 'staff' },
    tokensValidAfterTime: new Date(Date.now() - 3600000).toISOString(),
  });

  users.set('preview-customer-uid', {
    uid: 'preview-customer-uid',
    email: 'preview-customer@allbarka.test',
    emailVerified: true,
    disabled: false,
    customClaims: { role: 'customer' },
    tokensValidAfterTime: new Date(Date.now() - 3600000).toISOString(),
  });

  // Track uploaded images
  let simulateStorageFail = false;
  const uploadedFiles: Array<{ key: string; bytes: Buffer; options: any }> = [];
  const previewStorageBucketName = resolveStorageBucket({
    ALLBARKA_MODE: 'preview',
    FIREBASE_PROJECT_ID: 'allbarka-preview',
    STORAGE_BUCKET: 'allbarka-preview.firebasestorage.app',
  });
  assert.equal(previewStorageBucketName, 'allbarka-preview.firebasestorage.app');

  const mockStorageBucket = {
    name: previewStorageBucketName,
    file: (key: string) => ({
      save: async (bytes: Buffer, options: any) => {
        if (simulateStorageFail) throw new Error('Storage service unavailable');
        uploadedFiles.push({ key, bytes, options });
      },
    }),
  } as any;

  // Middleware wiring mirroring server.ts
  const requireAuth: any = (req: any, res: any, next: any) => {
    const authHeader = req.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required', code: 'AUTHENTICATION_REQUIRED' });
    }
    const tokenUid = authHeader.replace('Bearer ', '').trim();
    const userAccount = users.get(tokenUid);
    if (!userAccount) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'UNAUTHORIZED' });
    }
    req.user = {
      uid: userAccount.uid,
      email: userAccount.email,
      ...userAccount.customClaims,
      auth_time: Math.floor(Date.now() / 1000),
    };
    next();
  };

  const currentAdministrator = requireCurrentAdministrator(() => auth);
  const requireAdmin: any = (req: any, res: any, next: any) => requireAuth(req, res, () => currentAdministrator(req, res, next));

  const app = express();
  app.use(createProductUploadRouter({ requireAdmin, getBucket: () => mockStorageBucket }));
  app.use(express.json());
  app.use(createCatalogConfigurationRouter({ getDb: () => db, requireAdmin }));
  app.use(createCatalogRouter({ getDb: () => db, requireAdmin }));
  app.use(createStaffRouter({ getDb: () => db, getAuth: () => auth, requireAuth, requireAdmin }));
  app.use(createProductMediaRouter({ getDb: () => db, requireAdmin }));
  app.use(createInquiriesRouter({ getDb: () => db, getHamperBoxes: () => HAMPER_BOXES, requireAdmin }));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;

  const request = (pathUrl: string, options: { token?: string; method?: string; body?: any } = {}) => {
    const headers: Record<string, string> = {};
    if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
    if (options.body && typeof options.body === 'object' && !(options.body instanceof Buffer)) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(`${origin}${pathUrl}`, {
      method: options.method || (options.body ? 'POST' : 'GET'),
      headers,
      body: options.body instanceof Buffer ? options.body : options.body ? JSON.stringify(options.body) : undefined,
    });
  };

  try {
    // =========================================================================
    // STEP 1: Verify admin login and current server-enforced permissions
    // =========================================================================
    const adminCatalogRes = await request('/api/admin/catalog/products', { token: 'preview-admin-uid' });
    assert.equal(adminCatalogRes.status, 200, 'Admin can list products');
    const adminConfigRes = await request('/api/admin/catalog/configuration', { token: 'preview-admin-uid' });
    assert.equal(adminConfigRes.status, 200, 'Admin can read catalog configuration');
    const adminStaffRes = await request('/api/admin/staff', { token: 'preview-admin-uid' });
    assert.equal(adminStaffRes.status, 200, 'Admin can read staff list');

    // =========================================================================
    // STEP 2: Verify unauthenticated / customer access is denied
    // =========================================================================
    const unauthAdminRes = await request('/api/admin/catalog/products');
    assert.equal(unauthAdminRes.status, 401, 'Unauthenticated access to admin routes is denied 401');

    const customerAdminRes = await request('/api/admin/catalog/products', { token: 'preview-customer-uid' });
    assert.equal(customerAdminRes.status, 403, 'Customer access to admin routes is denied 403 FORBIDDEN_ADMIN');

    const unauthStaffRes = await request('/api/staff/orders');
    assert.equal(unauthStaffRes.status, 401, 'Unauthenticated access to staff orders is denied 401');

    const customerStaffRes = await request('/api/staff/orders', { token: 'preview-customer-uid' });
    assert.equal(customerStaffRes.status, 403, 'Customer access to staff orders is denied 403');

    // =========================================================================
    // STEP 3: Verify staff can view orders but CANNOT edit catalog/prices/roles
    // =========================================================================
    // Staff can view order list and details (sanitized, private supplier notes stripped)
    const staffOrdersRes = await request('/api/staff/orders', { token: 'preview-staff-uid' });
    assert.equal(staffOrdersRes.status, 200, 'Staff can view orders');
    const staffOrdersJson = await staffOrdersRes.json();
    assert.equal(staffOrdersJson.orders.length, 1);
    assert.doesNotMatch(JSON.stringify(staffOrdersJson), /SENSITIVE_SUPPLIER_INFO_DO_NOT_LEAK/, 'Staff order view strips private supplier notes');

    // Staff CANNOT edit catalog products
    const staffEditProductRes = await request('/api/admin/catalog/products', {
      token: 'preview-staff-uid',
      method: 'POST',
      body: { id: 'staff-forbidden', name_en: 'Forbidden' },
    });
    assert.equal(staffEditProductRes.status, 403, 'Staff cannot create products');

    // Staff CANNOT update product prices
    const staffPriceRes = await request('/api/admin/catalog/products/pista', {
      token: 'preview-staff-uid',
      method: 'PUT',
      body: { prices: { '250g': 9999 } },
    });
    assert.equal(staffPriceRes.status, 403, 'Staff cannot edit prices');

    // Staff CANNOT edit configuration or staff roles
    const staffConfigRes = await request('/api/admin/catalog/configuration', {
      token: 'preview-staff-uid',
      method: 'PUT',
      body: { taxonomy: [] },
    });
    assert.equal(staffConfigRes.status, 403, 'Staff cannot edit configuration');

    const staffRoleRes = await request('/api/admin/staff/preview-staff-uid', {
      token: 'preview-staff-uid',
      method: 'PUT',
      body: { enabled: true },
    });
    assert.equal(staffRoleRes.status, 403, 'Staff cannot edit staff roles');

    // =========================================================================
    // STEP 4: Create test draft item, save, reload and edit through actual admin UI/API
    // =========================================================================
    const testDraftItem: Partial<Product> = {
      id: 'test-preview-saffron',
      name_en: 'Preview Super Negin Saffron',
      name_ur: 'ٹیسٹ زعفران',
      name_ar: 'زعفران تجريبي',
      category: 'preview-dry-fruits',
      status: 'draft',
      active: false,
      orderMode: 'standard',
      prices: { '1g': 1200 },
      variants: [{ id: '1g', label: '1g', price: 1200, available: true }],
      desc_en: 'Pure preview saffron.',
    };

    const createDraftRes = await request('/api/admin/catalog/products', {
      token: 'preview-admin-uid',
      method: 'POST',
      body: testDraftItem,
    });
    assert.equal(createDraftRes.status, 201, 'Admin can create draft product');
    const createdJson = await createDraftRes.json();
    assert.equal(createdJson.product.id, 'test-preview-saffron');
    assert.equal(createdJson.product.status, 'draft');
    assert.equal(createdJson.product.revision, 1);

    // Reload item through admin API
    const reloadRes = await request('/api/admin/catalog/products/test-preview-saffron', { token: 'preview-admin-uid' });
    assert.equal(reloadRes.status, 200, 'Admin can reload product record');
    const reloadedProduct = (await reloadRes.json()).product;
    assert.equal(reloadedProduct.id, 'test-preview-saffron');
    assert.equal(reloadedProduct.status, 'draft');
    assert.equal(reloadedProduct.name_en, 'Preview Super Negin Saffron');

    // Edit draft item description
    const editDraftRes = await request('/api/admin/catalog/products/test-preview-saffron', {
      token: 'preview-admin-uid',
      method: 'PUT',
      body: {
        ...reloadedProduct,
        desc_en: 'Pure preview saffron — Grade A+ harvest.',
        expectedRevision: reloadedProduct.revision,
      },
    });
    assert.equal(editDraftRes.status, 200, 'Admin can edit draft item');
    const editedProduct = (await editDraftRes.json()).product;
    assert.equal(editedProduct.desc_en, 'Pure preview saffron — Grade A+ harvest.');
    assert.equal(editedProduct.revision, 2, 'Revision advanced on edit');

    // =========================================================================
    // STEP 5: Verify stale revision conflict preserves unsaved input
    // =========================================================================
    const staleEditRes = await request('/api/admin/catalog/products/test-preview-saffron', {
      token: 'preview-admin-uid',
      method: 'PUT',
      body: {
        ...editedProduct,
        desc_en: 'This conflicting edit should be rejected by the server.',
        expectedRevision: 999, // Stale revision
      },
    });
    assert.equal(staleEditRes.status, 409, 'Stale revision returns HTTP 409 CATALOG_REVISION_CONFLICT');
    const staleJson = await staleEditRes.json();
    assert.equal(staleJson.code, 'CATALOG_REVISION_CONFLICT');

    // Stored document must remain unchanged at revision 2
    const storedAfterConflict = records.get('products/test-preview-saffron') as any;
    assert.equal(storedAfterConflict.revision, 2);
    assert.equal(storedAfterConflict.desc_en, 'Pure preview saffron — Grade A+ harvest.');

    // =========================================================================
    // STEP 6: Upload real bounded test image to test bucket
    // =========================================================================
    // 6a. Valid PNG upload within bound
    const uploadRes = await fetch(`${origin}/api/admin/catalog/uploads`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer preview-admin-uid',
        'Content-Type': 'image/png',
      },
      body: PNG_BUFFER,
    });
    assert.equal(uploadRes.status, 201, 'Valid photo upload returns 201 Created');
    const uploadJson = await uploadRes.json();
    assert.ok(uploadJson.url.includes('firebasestorage.googleapis.com'), 'Returns storage public URL');
    assert.ok(uploadJson.url.includes('allbarka-preview.firebasestorage.app'), 'Upload URL targets preview bucket');
    assert.equal(uploadedFiles.length, 1);
    assert.equal(uploadedFiles[0].options.metadata.contentType, 'image/png');

    // 6b. Oversized upload rejected (> 5MB)
    const oversizedBuffer = Buffer.alloc(MAX_UPLOAD_BYTES + 1024);
    const oversizedRes = await fetch(`${origin}/api/admin/catalog/uploads`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer preview-admin-uid',
        'Content-Type': 'image/png',
      },
      body: oversizedBuffer,
    });
    assert.equal(oversizedRes.status, 413, 'Oversized photo upload returns 413 Payload Too Large');

    // 6c. Non-raster MIME rejected
    const nonRasterRes = await fetch(`${origin}/api/admin/catalog/uploads`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer preview-admin-uid',
        'Content-Type': 'image/svg+xml',
      },
      body: Buffer.from('<svg></svg>'),
    });
    assert.equal(nonRasterRes.status, 400, 'Non-raster photo upload returns 400 Invalid Image Type');

    // 6d. Storage provider failure fails closed honestly
    simulateStorageFail = true;
    const failedStorageRes = await fetch(`${origin}/api/admin/catalog/uploads`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer preview-admin-uid',
        'Content-Type': 'image/png',
      },
      body: PNG_BUFFER,
    });
    assert.equal(failedStorageRes.status, 503, 'Storage failure returns HTTP 503');
    simulateStorageFail = false;

    // =========================================================================
    // STEP 7: Publish test item only within isolated preview environment
    // =========================================================================
    // Before publishing, verify draft is NOT visible in public catalog
    const publicCatalogBefore = await (await request('/api/catalog')).json();
    assert.equal(
      publicCatalogBefore.products.some((p: any) => p.id === 'test-preview-saffron'),
      false,
      'Draft item is not visible in public catalog'
    );

    const publishRes = await request('/api/admin/catalog/products/test-preview-saffron', {
      token: 'preview-admin-uid',
      method: 'PUT',
      body: {
        ...storedAfterConflict,
        image: uploadJson.url,
        status: 'published',
        active: true,
        expectedRevision: storedAfterConflict.revision,
      },
    });
    assert.equal(publishRes.status, 200, 'Product published successfully');
    const publishedProduct = (await publishRes.json()).product;
    assert.equal(publishedProduct.status, 'published');
    assert.equal(publishedProduct.active, true);
    assert.equal(publishedProduct.revision, 3);

    // =========================================================================
    // STEP 8: Verify discovery & catalog refresh after test price edit
    // =========================================================================
    // 8a. Item now appears in public catalog
    const publicCatalogAfter = await (await request('/api/catalog')).json();
    const publicSaffron = publicCatalogAfter.products.find((p: any) => p.id === 'test-preview-saffron');
    assert.ok(publicSaffron, 'Published item appears in public catalog');
    assert.equal(publicSaffron.prices['1g'], 1200);

    // 8b. Single product endpoint returns public product
    const pdpRes = await request('/api/catalog/products/test-preview-saffron');
    assert.equal(pdpRes.status, 200, 'Public single product PDP returns 200');
    const pdpProduct = (await pdpRes.json()).product;
    assert.equal(pdpProduct.id, 'test-preview-saffron');
    assert.equal(pdpProduct.prices['1g'], 1200);

    // 8c. Test price edit from 1200 to 1400
    const priceEditRes = await request('/api/admin/catalog/products/test-preview-saffron', {
      token: 'preview-admin-uid',
      method: 'PUT',
      body: {
        ...publishedProduct,
        prices: { '1g': 1400 },
        variants: [{ id: '1g', label: '1g', price: 1400, available: true }],
        expectedRevision: publishedProduct.revision,
      },
    });
    assert.equal(priceEditRes.status, 200, 'Price edit succeeded');

    // Attach private/internal fields directly into the stored product record in Firestore
    const storedDoc = records.get('products/test-preview-saffron') as any;
    storedDoc.supplierCost = 800;
    storedDoc.internalNotes = 'SECRET_SUPPLIER_COST_PKR_800';

    // 8d. Public catalog immediately reflects updated price without server restart
    const publicCatalogUpdated = await (await request('/api/catalog')).json();
    const updatedSaffron = publicCatalogUpdated.products.find((p: any) => p.id === 'test-preview-saffron');
    assert.equal(updatedSaffron.prices['1g'], 1400, 'Public catalog immediately reflects updated price');

    const pdpUpdatedRes = await request('/api/catalog/products/test-preview-saffron');
    const pdpUpdatedJson = await pdpUpdatedRes.json();
    assert.equal(pdpUpdatedJson.product.prices['1g'], 1400, 'PDP reflects updated price');

    // =========================================================================
    // STEP 9: Verify draft/private fields remain hidden from public responses
    // =========================================================================
    assert.equal(updatedSaffron.supplierCost, undefined, 'Public catalog strips supplierCost');
    assert.equal(updatedSaffron.internalNotes, undefined, 'Public catalog strips internalNotes');
    assert.equal(updatedSaffron.updatedBy, undefined, 'Public catalog strips updatedBy');
    assert.doesNotMatch(JSON.stringify(publicCatalogUpdated), /SECRET_SUPPLIER_COST_PKR_800/);

    const pdpSanitized = pdpUpdatedJson.product;
    assert.equal(pdpSanitized.supplierCost, undefined, 'PDP strips supplierCost');
    assert.equal(pdpSanitized.internalNotes, undefined, 'PDP strips internalNotes');
    assert.equal(pdpSanitized.updatedBy, undefined, 'PDP strips updatedBy');
    assert.doesNotMatch(JSON.stringify(pdpSanitized), /SECRET_SUPPLIER_COST_PKR_800/);

    // Non-existent or unpublished products return 404 on public single product endpoint
    const nonExistentRes = await request('/api/catalog/products/non-existent-product');
    assert.equal(nonExistentRes.status, 404, 'Non-existent product returns 404');

    // =========================================================================
    // STEP 10: Missing ingredient rates or recipes remain honest Quote on Request
    // =========================================================================
    // Create an unpriced filled box without configured recipe
    const unpricedBox: Partial<Product> = {
      id: 'test-preview-unpriced-box',
      name_en: 'Preview Custom Unpriced Box',
      name_ur: 'ٹیسٹ غیر قیمت شدہ ڈبہ',
      name_ar: 'علبة تجريبية بدون سعر',
      category: 'gift-boxes',
      status: 'published',
      active: true,
      quoteOnly: true,
      orderMode: 'inquiry_quote',
      prices: {},
      isBidBox: true,
      bidBoxConfig: {
        capacityG: 500,
        boxStyle: 'Luxury Wooden Box',
      },
    };

    const createUnpricedRes = await request('/api/admin/catalog/products', {
      token: 'preview-admin-uid',
      method: 'POST',
      body: unpricedBox,
    });
    assert.equal(createUnpricedRes.status, 201, 'Unpriced box draft created successfully');

    // Customer inquiry estimate for unpriced box without configured recipes
    const quoteRes = await request('/api/quotes', {
      method: 'POST',
      body: {
        customerName: 'Preview Patron',
        customerPhone: '03001234567',
        productId: 'test-preview-unpriced-box',
        quantity: 1,
        netFillingGrams: 500,
        submissionKey: 'preview-sub-key-unpriced-001',
      },
    });
    assert.equal(quoteRes.status, 200, 'Inquiry quote endpoint returns 200');
    const quoteJson = await quoteRes.json();
    assert.equal(quoteJson.inquiry.requiresTeamQuote, true, 'Unpriced recipe strictly outputs requiresTeamQuote: true');
    assert.equal(quoteJson.inquiry.standardPrice, null, 'Unpriced recipe outputs null standardPrice');
    assert.equal(quoteJson.inquiry.estimatedTotalPkr, null, 'Unpriced recipe outputs null estimatedTotalPkr');

    // Authoritative order pricing must fail closed for unpriced inquiry-only items
    assert.throws(
      () =>
        validateAndPriceOrder({
          items: [
            {
              productId: 'test-preview-unpriced-box',
              quantity: 1,
              selectedWeight: '500g',
              price: 1500, // Customer attempting to purchase without merchant quote
            },
          ],
          products: [unpricedBox as Product],
          shippingMethodId: 'standard',
          city: 'Lahore',
        }),
      (err: any) => err.code === 'QUOTE_REQUIRED',
      'Attempt to purchase unpriced quote-only box throws QUOTE_REQUIRED'
    );
  } finally {
    server.close();
  }
});
