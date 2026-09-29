import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const adminUid = process.env.ADMIN_UID;
const projectId = process.env.FIREBASE_PROJECT_ID || 'allbarka-live';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!adminUid) {
  console.error('Error: ADMIN_UID environment variable is required.');
  process.exit(1);
}

if (!clientEmail || !privateKey) {
  console.error('Error: FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are required.');
  process.exit(1);
}

try {
  const credentialOptions = cert({
    projectId,
    clientEmail: clientEmail.trim(),
    privateKey: privateKey.replace(/\\n/g, '\n'),
  });

  const app = initializeApp({ credential: credentialOptions, projectId });
  const auth = getAuth(app);

  await auth.setCustomUserClaims(adminUid, { admin: true, role: 'admin' });
  console.log(`Successfully set admin claims for user ${adminUid}`);
  process.exit(0);
} catch (error) {
  console.error('Error setting admin claims:', error);
  process.exit(1);
}
