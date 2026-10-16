import React from 'react';

const CHUNK_RELOAD_STORAGE_KEY = 'allbarka_chunk_reload_attempted';

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('ChunkLoadError') ||
    message.includes('Unable to preload CSS')
  );
}

/**
 * Wraps React.lazy(() => import(...)) with automatic one-time reload recovery
 * when a new deployment invalidates old hashed chunk filenames.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  chunkKey = 'default'
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const storageKey = `${CHUNK_RELOAD_STORAGE_KEY}:${chunkKey}`;
    try {
      const componentModule = await importer();
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.removeItem(storageKey);
          window.sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY);
        } catch {
          // Ignore storage access errors in restricted browsing modes
        }
      }
      return componentModule;
    } catch (error) {
      if (typeof window !== 'undefined' && isChunkLoadError(error)) {
        try {
          const alreadyReloaded = window.sessionStorage.getItem(storageKey) === '1';
          if (!alreadyReloaded) {
            window.sessionStorage.setItem(storageKey, '1');
            window.location.reload();
            return new Promise<{ default: T }>(() => {});
          }
        } catch {
          // Fall through and rethrow if sessionStorage is unavailable
        }
      }
      throw error;
    }
  });
}
