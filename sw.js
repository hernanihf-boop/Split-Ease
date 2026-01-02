
const CACHE_NAME = 'splitease-cache-v5';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  // No cachear las llamadas a la API de Netlify/Vercel/Gemini
  if (event.request.url.includes('/.netlify/functions/') || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(fetchResponse => {
        // Solo cachear recursos estáticos conocidos o de confianza
        if (fetchResponse.ok && (
            event.request.url.startsWith(self.location.origin) || 
            event.request.url.includes('cdn.tailwindcss.com') ||
            event.request.url.includes('esm.sh')
        )) {
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return fetchResponse;
      });
    }).catch(() => {
      if (event.request.mode === 'navigate') {
        return caches.match('/');
      }
    })
  );
});
