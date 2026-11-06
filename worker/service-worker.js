const { cacheNames, clientsClaim } = require('workbox-core');
const {
  precacheAndRoute,
  getCacheKeyForURL,
  cleanupOutdatedCaches,
} = require('workbox-precaching');
const { registerRoute } = require('workbox-routing');
const { NetworkFirst } = require('workbox-strategies');
const { ExpirationPlugin } = require('workbox-expiration');

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

self.addEventListener('message', event => {
  if (event.data?.type !== 'OFFLINE_CACHE_INFO' || !event.ports[0]) return;
  event.ports[0].postMessage({
    cacheName: cacheNames.precache,
    keys: Object.fromEntries(manifest.map(({ url }) => {
      const absolute = new URL(url, self.location.origin).href;
      return [absolute, getCacheKeyForURL(absolute)];
    })),
  });
});
