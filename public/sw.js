// AllBarka Lightweight Static Service Worker
// STRICT SAFETY RULE: NEVER cache API, checkout, or admin routes.

const CACHE_NAME = 'allbarka-static-v1';

// Static precache list for core UI offline resilience
const PRECACHE_ASSETS = [
  '/',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
];

// Routes and paths that must NEVER be cached or intercepted by service worker
function isBypassedUrl(url) {
  const pathname = url.pathname;
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/staff') ||
    url.searchParams.has('nocache')
  );
}

// Check if request is a static asset suitable for caching
function isStaticAsset(request, url) {
  if (request.method !== 'GET') return false;
  if (isBypassedUrl(url)) return false;

  const pathname = url.pathname;
  const destination = request.destination;

  return (
    destination === 'style' ||
    destination === 'script' ||
    destination === 'image' ||
    destination === 'font' ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/images/') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.ttf') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('allbarka-static-') && name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Non-GET or cross-origin requests that are not static assets bypass service worker completely
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 2. Strict Security Bypass: API, checkout, admin, staff MUST NEVER be cached
  if (isBypassedUrl(url)) {
    return;
  }

  // 3. Static assets: Cache-First with Network fallback and cache update
  if (isStaticAsset(request, url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch fresh copy in background to revalidate
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          return networkResponse;
        });
      })
    );
    return;
  }

  // 4. HTML navigations: Network-first with cache fallback (excluding bypassed routes)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/').then((fallback) => fallback || Response.error());
      })
    );
  }
});
