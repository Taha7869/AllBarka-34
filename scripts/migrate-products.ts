import dotenv from 'dotenv';
dotenv.config();

import { initializeApp, cert, getApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PRODUCTS } from '../src/data/products.js';
import fs from 'fs';
import path from 'path';

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
const db = getFirestore(getApp(), dbId); db.settings({ ignoreUndefinedProperties: true });

const args = process.argv.slice(2);
const isExecute = args.includes('--execute');

async function run() {
  console.log(`===========================================`);
  console.log(`Connected to Project: ${projectId}`);
  console.log(`Connected to Database: ${dbId}`);
  console.log(`Mode: ${isExecute ? 'EXECUTE (Writing to DB)' : 'DRY-RUN (No writes)'}`);
  console.log(`===========================================\n`);

  const productsRef = db.collection('products');
  const existingSnapshot = await productsRef.get();
  
  const existingDocs = existingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  console.log(`Found ${existingDocs.length} existing documents in 'products' collection.`);
  
  if (existingDocs.length > 0) {
    console.log(`Existing Document IDs: ${existingDocs.map(d => d.id).join(', ')}`);
    
    // Backup
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `products-backup-${dateStr}.json`);
    
    fs.writeFileSync(backupPath, JSON.stringify(existingDocs, null, 2));
    console.log(`Backed up existing products to: ${backupPath}\n`);
  } else {
    console.log(`No existing documents to backup.\n`);
  }

  if (isExecute) {
    if (PRODUCTS.length > 500) {
       console.error("Too many products for a single batch!");
       process.exit(1);
    }
    const batch = db.batch();
    for (const product of PRODUCTS) {
      batch.set(productsRef.doc(product.id), product);
    }
    await batch.commit();
    console.log(`Successfully wrote ${PRODUCTS.length} products to Firestore.`);
  } else {
    console.log(`--- DRY-RUN SAMPLES ---`);
    const samples = [];
    
    // Find an existing one (e.g. kishmish or from existing ones)
    const existingSample = PRODUCTS.find(p => p.id === 'kishmish') || PRODUCTS[0];
    if (existingSample) samples.push({ desc: "Existing Product", data: existingSample });
    
    // Find an addition (e.g. ceylon-cinnamon)
    const additionSample = PRODUCTS.find(p => p.id === 'ceylon-cinnamon') || PRODUCTS[PRODUCTS.length - 1];
    if (additionSample) samples.push({ desc: "New Addition", data: additionSample });
    
    // Find one with custom weights
    const customWeightSample = PRODUCTS.find(p => p.id === 'kaju') || PRODUCTS.find(p => p.pricePer100g);
    if (customWeightSample) samples.push({ desc: "Custom Weight Rates", data: customWeightSample });
    
    for (const sample of samples) {
      console.log(`\nSample: ${sample.desc} (ID: ${sample.data.id})`);
      console.log(JSON.stringify(sample.data, null, 2));
    }
    
    console.log(`\nDry-run complete. Total payload size to write: ${PRODUCTS.length} products.`);
    console.log(`Run with --execute to commit to Firestore.`);
  }
}

run().catch(console.error);
