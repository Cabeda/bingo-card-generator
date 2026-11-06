const { cacheNames, clientsClaim, copyResponse } = require('workbox-core');
const {
  precacheAndRoute,
  getCacheKeyForURL,
  cleanupOutdatedCaches,
} = require('workbox-precaching');
const { registerRoute } = require('workbox-routing');
const { NetworkFirst } = require('workbox-strategies');
const { ExpirationPlugin } = require('workbox-expiration');

const { activeCacheIsComplete } = require('./cacheIntegrity');

const manifest = self.__WB_MANIFEST;
precacheAndRoute(manifest, {
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^dpl$/],
});
cleanupOutdatedCaches();
clientsClaim();

registerRoute(
  ({ url }) => url.origin === self.location.origin,
  new NetworkFirst({
    cacheName: 'offlineCache',
    plugins: [new ExpirationPlugin({ maxEntries: 200 })],
  }),
  'GET',
);

self.addEventListener('install', event => {
  const active = self.registration.active;
  if (!active) return;
  event.waitUntil(activeCacheIsComplete(active).then(complete => {
    if (!complete) return self.skipWaiting();
  }));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'OFFLINE_REPAIR' && event.ports[0]) {
    event.waitUntil((async () => {
      try {
        const url = new URL(event.data.url, self.location.origin);
        url.searchParams.delete('dpl');
        const key = getCacheKeyForURL(url.href);
        if (!key) throw new Error('Resource is not precached');
        const response = await fetch(url.href, { cache: 'reload' });
        if (!response.ok) throw new Error('Resource unavailable');
        const cache = await caches.open(cacheNames.precache);
        await cache.put(key, response.redirected ? await copyResponse(response) : response);
        event.ports[0].postMessage({ ok: true });
      } catch {
        event.ports[0].postMessage({ ok: false });
      }
    })());
    return;
  }
  if (event.data?.type !== 'OFFLINE_CACHE_INFO' || !event.ports[0]) return;
  event.ports[0].postMessage({
    cacheName: cacheNames.precache,
    keys: Object.fromEntries(manifest.map(({ url }) => {
      const absolute = new URL(url, self.location.origin).href;
      return [absolute, getCacheKeyForURL(absolute)];
    })),
  });
});
