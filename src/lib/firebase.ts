import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { app, config } from './firebaseAuth';
export { auth } from './firebaseAuth';

const customDbId = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
  ? config.firestoreDatabaseId
  : undefined;

// Use initializeFirestore with experimentalForceLongPolling to prevent WebChannel stream failures in iframes
export const db = (() => {
  try {
    return customDbId
      ? initializeFirestore(app, { experimentalForceLongPolling: true }, customDbId)
      : initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch (_e) {
    return customDbId ? getFirestore(app, customDbId) : getFirestore(app);
  }
})();
