const CACHE_NAME = 'splitease-cache-v3'; // Version bumped to trigger update
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/components/UserManagement.tsx',
  '/components/ExpenseForm.tsx',
  '/components/ExpenseList.tsx',
  '/components/Summary.tsx',
  '/components/icons.tsx',
  '/manifest.json',
  '/icon.svg',
  'https://cdn.tailwindcss.com',
  'https://esm.sh/react@^19.1.0',
  'https://esm.sh/react-dom@^19.1.0/client',
  'https://esm.sh/react@^19.1.0/jsx-runtime',
  'https://esm.sh/xlsx'
];

// Install the service worker and cache all the app's shell resources.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch(error => {
        console.error('Failed to cache assets during install:', error);
      })
  );
});

// Intercept fetch requests and serve from cache if available.
// If not in cache, fetch from network, cache the response, and then return it.
self.addEventListener('fetch', event => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If the resource is in the cache, return it.
        if (cachedResponse) {
          return cachedResponse;
        }

        // If the resource is not in the cache, fetch it from the network.
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response.
            // We can cache successful responses (status 200-299).
            if (networkResponse && networkResponse.ok) {
              // Clone the response because it's a stream and can only be consumed once.
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }
        ).catch(error => {
            console.error('Fetch failed; resource not available offline.', error);
            // This will be triggered if the network fails when offline.
            // Since we already checked the cache, this means the resource is not available.
        });
      })
  );
});

// Clean up old caches when a new service worker is activated.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});