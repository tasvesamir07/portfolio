importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
  // Force development logs off in production
  workbox.setConfig({ debug: false });

  const CACHE_VERSION = '20260621';

  // Precache basic layouts (truly static, unhashed assets)
  workbox.precaching.precacheAndRoute([
    { url: '/favicon.svg', revision: CACHE_VERSION },
    { url: '/manifest.json', revision: CACHE_VERSION },
    { url: '/icon-192.png', revision: CACHE_VERSION },
    { url: '/icon-512.png', revision: CACHE_VERSION }
  ]);

  // Install handler to cache the latest index.html for fallback
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open('portfolio-fallback-cache').then((cache) => {
        // Fetch index.html with cache: 'reload' to ensure we bypass browser HTTP cache and get fresh content
        return fetch(new Request('/index.html', { cache: 'reload' }))
          .then((response) => {
            if (response.ok) {
              return cache.put('/index.html', response);
            }
            throw new Error('Failed to fetch index.html during install');
          });
      })
    );
  });

  // Cache JS/CSS assets (hashed by Vite) with Cache-First strategy
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style',
    new workbox.strategies.CacheFirst({
      cacheName: 'portfolio-assets-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // Cache images with NetworkFirst strategy (falls back to cache on network failure)
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.NetworkFirst({
      cacheName: 'portfolio-images-cache',
      networkTimeoutSeconds: 8,
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
      cacheName: 'portfolio-api-page-data-cache',
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
      cacheName: 'portfolio-fonts-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 Year
        }),
      ],
    })
  );

  // Fallback for navigation requests (SPA routing) - NetworkFirst strategy
  const navigationStrategy = new workbox.strategies.NetworkFirst({
    cacheName: 'portfolio-navigation-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 Days
      }),
    ],
  });

  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    async (options) => {
      try {
        return await navigationStrategy.handle(options);
      } catch (error) {
        // Fallback to index.html if offline/network fails
        return (await caches.match('/index.html')) || Response.error();
      }
    }
  );

  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });
}

