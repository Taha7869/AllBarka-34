import { getFirestore } from 'firebase-admin/firestore';
import { Product } from '../types.ts';
import { PRODUCTS } from '../data/products';
import { getApp, getApps } from 'firebase-admin/app';

let cachedCatalog: Product[] | null = null;
let catalogCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCatalogServer(): Promise<{ catalog: Product[], source: 'firestore' | 'static-fallback' | 'static' }> {
  // Amendment B: Kill switch
  if (process.env.CATALOG_SOURCE === 'static') {
    return { catalog: PRODUCTS, source: 'static' };
  }

  const now = Date.now();
  if (cachedCatalog && now - catalogCacheTime < CACHE_TTL) {
    return { catalog: cachedCatalog, source: 'firestore' };
  }

  try {
    if (!getApps().length) {
      // If firebase admin is not initialized (e.g. testing), fallback silently
      return { catalog: PRODUCTS, source: 'static-fallback' };
    }
    const db = getFirestore();
    const snapshot = await db.collection('products').get();
    
    if (snapshot.empty) {
      return { catalog: PRODUCTS, source: 'static-fallback' };
    }

    const fetchedProducts: Product[] = [];
    snapshot.forEach(doc => {
      fetchedProducts.push(doc.data() as Product);
    });

    cachedCatalog = fetchedProducts;
    catalogCacheTime = now;
    return { catalog: fetchedProducts, source: 'firestore' };
  } catch (error) {
    console.error('Error fetching live catalog from Firestore, falling back to static:', error);
    return { catalog: PRODUCTS, source: 'static-fallback' };
  }
}
