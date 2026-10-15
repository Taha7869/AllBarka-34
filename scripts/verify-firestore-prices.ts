import dotenv from 'dotenv';
dotenv.config();

import { initializeApp, cert, getApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'allbarka-live';

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!clientEmail || !privateKey) {
  console.error("Missing Firebase credentials in .env");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    projectId,
    credential: cert({
      projectId,
      clientEmail: clientEmail.trim(),
      privateKey: privateKey.replace(/\\n/g, '\n'),
    })
  });
}

const dbId = process.env.FIRESTORE_DATABASE_ID || '(default)';
const db = getFirestore(getApp(), dbId);
db.settings({ ignoreUndefinedProperties: true });

async function verify() {
  const ids = ['kishmish', 'kaju', 'ceylon-cinnamon'];
  for (const id of ids) {
    const doc = await db.collection('products').doc(id).get();
    if (!doc.exists) {
      console.log(`Document ${id} does not exist in Firestore!`);
    } else {
      const data = doc.data();
      console.log(`--- ${id} ---`);
      console.log(`Variants:`);
      console.log(JSON.stringify(data?.variants, null, 2));
      console.log(`Legacy Prices map:`);
      console.log(JSON.stringify(data?.prices, null, 2));
      if (data?.pricePer100g) {
        console.log(`pricePer100g: ${data.pricePer100g}`);
      }
      console.log('');
    }
  }
}

verify().catch(console.error);
