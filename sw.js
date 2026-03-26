const CACHE_NAME = 'mpesa-agent-v1';
const ASSETS = [
  '.',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=DM+Sans:wght@300;400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install — cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate — clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', event => {
  // Skip non-GET and Supabase API calls (always need live data)
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache new valid responses
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — return index.html
        return caches.match('./index.html');
      });
    })
  );
});
```

---

## File 3 — Create the Icons folder

You need an `icons` folder with two PNG files:
- `icons/icon-192x192.png`
- `icons/icon-512x512.png`

The quickest way is to use this free tool:
👉 **[https://realfavicongenerator.net](https://realfavicongenerator.net)**

1. Upload any image (your M-Pesa logo or a green 📱 icon)
2. Download the generated icons
3. Rename them to `icon-192x192.png` and `icon-512x512.png`
4. Put them in an `icons/` folder next to your `index.html`

---

## Your final folder structure should look like:
```
your-repo/
├── index.html
├── manifest.json        ← new
├── sw.js                ← new
└── icons/
    ├── icon-192x192.png ← new
    └── icon-512x512.png ← new
