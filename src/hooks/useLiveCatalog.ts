import { useSyncExternalStore } from 'react';
import { catalogStore } from '../lib/catalogClient';

/** All storefront consumers share one request, revision and refresh lifecycle. */
export function useCatalogState() { return useSyncExternalStore(catalogStore.subscribe, catalogStore.getSnapshot, catalogStore.getServerSnapshot); }
export function useLiveCatalog() { return useCatalogState().catalog; }
