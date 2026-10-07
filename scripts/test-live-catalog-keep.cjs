const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const dotenv = require('dotenv');

dotenv.config();

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'allbarka-live';

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

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

const db = getFirestore();
const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('--- STARTING SAFE TEST PLAN ---');
  
  // 1. Get kishmish and create zz-test-probe
  const kishmishDoc = await db.collection('products').doc('kishmish').get();
  const probeData = kishmishDoc.data();
  probeData.id = 'zz-test-probe';
  probeData.name = 'Test Probe';
  probeData.variants = [
    { label: '250g', price: 999 },
    { label: '500g', price: 1998 },
    { label: '1kg', price: 3996 }
  ];
  probeData.prices = { '250g': 999, '500g': 1998, '1kg': 3996 };
  
  await db.collection('products').doc('zz-test-probe').set(probeData);
  console.log('Created zz-test-probe in Firestore with price 999.');
  
  const catalogRes = await fetch(BASE_URL + '/api/catalog');
  const catalog = await catalogRes.json();
  console.log('Fetched /api/catalog. Source:', catalogRes.headers.get('x-catalog-source'));
  
  const probeInCatalog = catalog.find && catalog.find(c => c.id === 'zz-test-probe');
  if (probeInCatalog) {
    console.log('✅ Found zz-test-probe in /api/catalog:', probeInCatalog.prices);
  } else {
    console.log('⚠️ zz-test-probe NOT found in /api/catalog (likely due to 5-min cache).');
  }

  // Actually keep it, no delete.
  console.log('Kept zz-test-probe in Firestore for visual testing.');
}

run().catch(console.error);


