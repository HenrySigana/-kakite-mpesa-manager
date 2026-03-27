// M-Pesa Agent Manager — Service Worker
// Kakite Investment PWA

const CACHE_NAME = 'mpesa-agent-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=DM+Sans:wght@300;400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// ─── Install: cache static assets ───────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache what we can — fonts & CDN might fail, that's okay
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Could not cache:', url, err))
        )
      );
    }).then(() => {
      console.log('[SW] Installed successfully');
      return self.skipWaiting();
    })
  );
});

// ─── Activate: clean old caches ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      console.log('[SW] Activated');
      return self.clients.claim();
    })
  );
});

// ─── Fetch: Network-first for Supabase, Cache-first for static ───────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always network-first for Supabase API calls (live data matters)
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.io')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If offline, return a generic offline response for API calls
        return new Response(
          JSON.stringify({ error: 'Offline — data unavailable', offline: true }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // For Google Fonts and CDN — network first, fall back to cache
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For local files — Cache-first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful responses
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // If completely offline and requesting the main page, serve cached index
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
