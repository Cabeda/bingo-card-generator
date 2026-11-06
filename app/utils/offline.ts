import { OFFLINE_ROUTES } from './offlineRoutes';

interface OfflineCacheInfo {
  cacheName: string;
  keys: Record<string, string>;
}

async function ensureCached(url: string, cache: Cache, keys: Record<string, string>, repair: (url: string) => Promise<void>): Promise<Response | undefined> {
  const canonical = new URL(url);
  canonical.searchParams.delete('dpl');
  const key = keys[canonical.href];
  if (!key) throw new Error(`Resource is not in the active offline manifest: ${url}`);
  const cached = await cache.match(key);
  if (cached || !navigator.onLine) return cached;
  // The worker fetches directly from the network, avoiding a fetch through its own missing precache route.
  await repair(url);
  return cache.match(key);
}

const REQUIRED_FILES = ['/manifest.json', '/icon-192x192.png', '/icon-384x384.png', '/icon-512x512.png'];

/** Verify the installed cache now; browsers can still evict stored data later. */
export async function prepareOffline(): Promise<void> {
  let finished = false;
  let channel: MessageChannel | undefined;
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Offline preparation timed out')), 30_000);
  });
  const verify = async () => {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const ready = await navigator.serviceWorker.ready;
    if (finished) return;
    const message = (data: unknown) => {
      channel?.port1.close();
      channel?.port2.close();
      channel = new MessageChannel();
      return new Promise<unknown>(resolve => {
        channel!.port1.onmessage = event => resolve(event.data);
        ready.active!.postMessage(data, [channel!.port2]);
      });
    };
    const info = await message({ type: 'OFFLINE_CACHE_INFO' }) as OfflineCacheInfo;
    if (!info || typeof info.cacheName !== 'string' || !info.keys || typeof info.keys !== 'object') {
      throw new Error('Invalid active offline cache information');
    }
    const repair = async (url: string) => {
      const result = await message({ type: 'OFFLINE_REPAIR', url }) as { ok?: boolean } | null;
      if (result?.ok !== true) throw new Error(`Offline resource repair failed: ${url}`);
    };
    const cache = await caches.open(info.cacheName);
    const assets = new Set(REQUIRED_FILES.map(path => new URL(path, window.location.origin).href));
    for (const route of OFFLINE_ROUTES) {
      const url = new URL(route, window.location.origin);
      const response = await ensureCached(url.href, cache, info.keys, repair);
      if (!response?.ok || !response.headers.get('content-type')?.includes('text/html')) {
        throw new Error(`Offline page unavailable: ${route}`);
      }
      const document = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (!document.querySelector('script[src]')) throw new Error(`Offline page has no scripts: ${route}`);
      for (const element of document.querySelectorAll('script[src], link[rel="stylesheet"][href]')) {
        const path = element.getAttribute(element.tagName === 'SCRIPT' ? 'src' : 'href')!;
        const asset = new URL(path, url);
        if (asset.origin !== window.location.origin) throw new Error(`External offline asset: ${asset.href}`);
        assets.add(asset.href);
      }
    }
    for (const asset of assets) {
      const response = await ensureCached(asset, cache, info.keys, repair);
      if (!response?.ok) throw new Error(`Offline asset unavailable: ${asset}`);
    }
    try {
      void navigator.storage?.persist?.().catch(() => {});
    } catch {
      // Persistence is best effort; a denied request does not invalidate the cache.
    }
  };
  try {
    await Promise.race([verify(), timeout]);
  } finally {
    finished = true;
    clearTimeout(timer!);
    channel?.port1.close();
    channel?.port2.close();
  }
}
