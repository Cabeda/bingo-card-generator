const { cacheNames, clientsClaim, copyResponse } = require('workbox-core');
const {
  precacheAndRoute,
  getCacheKeyForURL,
  matchPrecache,
  cleanupOutdatedCaches,
} = require('workbox-precaching');
const { registerRoute } = require('workbox-routing');
const { NetworkFirst } = require('workbox-strategies');
const { ExpirationPlugin } = require('workbox-expiration');

const manifest = self.__WB_MANIFEST;
// Navigation must reach the server before the precache route can return older HTML.
// Keep the most recently visited pages, falling back to the installed deck offline.
const navigationCachePrefix = 'bingo-navigation-v1-';
// The build injects a revision for every localized entry point, including /en.
const navigationCacheName = navigationCachePrefix + manifest.find(({ url }) => url === '/en').revision;
const navigation = new NetworkFirst({
  cacheName: navigationCacheName,
  plugins: [new ExpirationPlugin({ maxEntries: 20 })],
});
registerRoute(
  ({ request, url }) => request.mode === 'navigate' && url.origin === self.location.origin,
  async ({ event, request }) => {
    try {
      return await navigation.handle({ event, request });
    } catch (error) {
      const cached = await matchPrecache(new URL(request.url).pathname);
      if (cached) return cached;
      throw error;
    }
  },
  'GET',
);

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

// Workbox finishes the complete new precache before activation can occur.
// Adopt it without reloading open games; their next navigation uses the new build.
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(
    names.filter(name => (name.startsWith(navigationCachePrefix) && name !== navigationCacheName) || name === 'bingo-navigation-v1')
      .map(name => caches.delete(name)),
  )));
});

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
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
