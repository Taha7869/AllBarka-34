import dotenv from 'dotenv';
dotenv.config();

import { initializeApp, cert, getApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PRODUCTS } from '../src/data/products.js';

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

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
  }
  return true;
}

async function runDiff() {
  console.log('--- FULL SOURCE VS FIRESTORE DIFF ---');
  let mismatchCount = 0;
  
  const snapshot = await db.collection('products').get();
  const firestoreDocs = new Map();
  snapshot.docs.forEach(doc => firestoreDocs.set(doc.id, doc.data()));
  
  for (const sourceProduct of PRODUCTS) {
    const fsProduct = firestoreDocs.get(sourceProduct.id);
    if (!fsProduct) {
      console.log(`${sourceProduct.id} | ALL | [Exists] | [Missing] | MISMATCH`);
      mismatchCount++;
      continue;
    }
    
    // Check every key in source product
    for (const [key, sourceVal] of Object.entries(sourceProduct)) {
      if (sourceVal === undefined) continue; // Undefined fields are stripped by ignoreUndefinedProperties
      
      const fsVal = fsProduct[key];
      if (!deepEqual(sourceVal, fsVal)) {
        console.log(`${sourceProduct.id} | ${key} | ${JSON.stringify(sourceVal)} | ${JSON.stringify(fsVal)} | MISMATCH`);
        mismatchCount++;
      }
    }
  }
  
  console.log(`\nTotal mismatches: ${mismatchCount}\n`);
  
  console.log('--- FIELD-COVERAGE AUDIT ---');
  const targetIds = ['kishmish', 'kaju', 'org-saffron', 'medjool-dates', 'bundle-royal-feast'];
  for (const targetId of targetIds) {
    console.log(`\nAuditing: ${targetId}`);
    const sourceProduct = PRODUCTS.find(p => p.id === targetId);
    const fsProduct = firestoreDocs.get(targetId);
    
    if (!sourceProduct || !fsProduct) {
      console.log(`Missing in source or firestore!`);
      continue;
    }
    
    const sourceKeys = Object.keys(sourceProduct);
    const fsKeys = Object.keys(fsProduct);
    
    const missingInFs = sourceKeys.filter(k => (sourceProduct as any)[k] !== undefined && !fsKeys.includes(k));
    const missingInSource = fsKeys.filter(k => !sourceKeys.includes(k));
    
    console.log(`Source fields: ${sourceKeys.join(', ')}`);
    console.log(`Firestore fields: ${fsKeys.join(', ')}`);
    
    if (missingInFs.length > 0) {
      console.log(`FLAG: Source fields missing in Firestore: ${missingInFs.join(', ')}`);
    } else {
      console.log(`All defined source fields exist in Firestore.`);
    }
    if (missingInSource.length > 0) {
      console.log(`FLAG: Firestore fields missing in Source: ${missingInSource.join(', ')}`);
    }
  }
}

runDiff().catch(console.error);
