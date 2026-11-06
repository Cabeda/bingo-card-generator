// Inspect the previous worker before deciding whether waiting would strand a broken app.
function activeCacheIsComplete(active) {
  const channel = new MessageChannel();
  return new Promise(resolve => {
    let finished = false;
    let inspectionTimer;
    const finish = complete => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearTimeout(inspectionTimer);
      channel.port1.close();
      channel.port2.close();
      resolve(complete);
    };
    const timer = setTimeout(() => finish(false), 2000);
    channel.port1.onmessage = async event => {
      if (finished) return;
      try {
        const info = event.data;
        if (!info || typeof info.cacheName !== 'string' || !info.keys || typeof info.keys !== 'object') return finish(false);
        clearTimeout(timer);
        // A slow cache is not evidence of corruption: preserve the normal waiting lifecycle.
        inspectionTimer = setTimeout(() => finish(true), 10_000);
        const cache = await caches.open(info.cacheName);
        let pages = 0;
        for (const [url, key] of Object.entries(info.keys)) {
          if (typeof key !== 'string') return finish(false);
          const response = await cache.match(key);
          if (!response?.ok) return finish(false);
          if (!response.headers.get('content-type')?.includes('text/html')) continue;
          pages++;
          const html = await response.text();
          const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:css|js)(?:\?[^"']*)?)["']/g)];
          if (!assets.length) return finish(false);
          for (const [, path] of assets) {
            const asset = new URL(path.replaceAll('&amp;', '&'), url);
            asset.searchParams.delete('dpl');
            if (!info.keys[asset.href]) return finish(false);
          }
        }
        finish(pages > 0);
      } catch {
        finish(false);
      }
    };
    try {
      active.postMessage({ type: 'OFFLINE_CACHE_INFO' }, [channel.port2]);
    } catch {
      finish(false);
    }
  });
}

module.exports = { activeCacheIsComplete };
