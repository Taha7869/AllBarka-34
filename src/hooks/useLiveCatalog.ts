import { useState, useEffect } from 'react';
import { PRODUCTS } from '../data/products';
import type { Product } from '../types';

let cachedLiveCatalog: Product[] | null = null;
let fetchPromise: Promise<Product[]> | null = null;

export function useLiveCatalog() {
  const [catalog, setCatalog] = useState<Product[]>(cachedLiveCatalog || PRODUCTS);

  useEffect(() => {
    let mounted = true;
    
    if (cachedLiveCatalog) {
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetch('/api/catalog')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch catalog');
          return res.json();
        })
        .then((data: Product[]) => {
          if (Array.isArray(data) && data.length > 0) {
            cachedLiveCatalog = data;
            return data;
          }
          throw new Error('Invalid catalog format or empty');
        })
        .catch(err => {
          console.error('useLiveCatalog error, falling back to static:', err);
          return PRODUCTS;
        });
    }

    fetchPromise.then(liveData => {
      if (mounted && liveData !== catalog) {
        setCatalog(liveData);
      }
    });

    return () => {
      mounted = false;
    };
  }, [catalog]);

  return catalog;
}
