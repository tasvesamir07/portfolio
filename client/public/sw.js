importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
  // Force development logs off in production
  workbox.setConfig({ debug: false });

  // Precache basic layouts
  workbox.precaching.precacheAndRoute([
    { url: '/', revision: '1' },
    { url: '/index.html', revision: '1' },
    { url: '/favicon.svg', revision: '1' },
    { url: '/manifest.json', revision: '1' },
    { url: '/icon-192.png', revision: '1' },
    { url: '/icon-512.png', revision: '1' }
  ]);

  // Cache JS/CSS assets (hashed by Vite) with Cache-First strategy
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style',
    new workbox.strategies.CacheFirst({
      cacheName: 'samir-assets-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // Cache images with Cache-First strategy
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'samir-images-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // Stale-While-Revalidate for /api/v1/page-data
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.includes('/api/v1/page-data'),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'samir-api-page-data-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 24 * 60 * 60, // 1 Day max
        }),
      ],
    })
  );

  // Cache-first for self-hosted font files
  workbox.routing.registerRoute(
    ({ url }) => url.origin === self.location.origin && (url.pathname.includes('.woff') || url.pathname.includes('.ttf')),
    new workbox.strategies.CacheFirst({
      cacheName: 'samir-fonts-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 Year
        }),
      ],
    })
  );

  // Fallback for navigation requests (SPA routing)
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    async () => {
      return (await caches.match('/index.html')) || fetch('/index.html');
    }
  );
}

