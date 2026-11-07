import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { resolveFirebaseClientConfig } from './environmentConfig';

export const config = resolveFirebaseClientConfig(import.meta.env);

export const app = getApps().length > 0 ? getApp() : initializeApp(config);
export const auth = getAuth(app);
