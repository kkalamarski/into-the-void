// Into the Void - Service Worker for Asset Caching
// Cache-first for static game assets, network-first for API/WebSocket

const CACHE_VERSION = 'itv-assets-v1';

// Patterns that identify static game assets (cache-first)
const ASSET_PATTERNS = [
  /\/assets\//,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.webp$/,
  /\.mp3$/,
  /\.ogg$/,
  /\.wav$/,
  /\.woff$/,
  /\.woff2$/,
  /\.ttf$/,
  /\.otf$/,
  /\.svg$/,
];

// Patterns that should always go network-first (API, auth, WebSocket)
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /socket\.io/,
  /\/auth\//,
  /hot-update/,
  /\/@vite/,
  /\/__vite/,
];

// --- Install ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // Pre-cache the app shell
      return cache.addAll(['/']);
    })
  );
  // Activate immediately without waiting for existing clients to close
  self.skipWaiting();
});

// --- Activate ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Claim all open clients immediately
  self.clients.claim();
});

// --- Fetch ---
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Network-first for API, WebSocket, auth, and dev server resources
  if (NETWORK_FIRST_PATTERNS.some((pattern) => pattern.test(url.pathname + url.search))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first for static game assets
  if (ASSET_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network-first with cache fallback for everything else (HTML, JS, CSS)
  event.respondWith(networkFirst(request));
});

// --- Strategies ---

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return a basic offline fallback if both cache and network fail
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}
