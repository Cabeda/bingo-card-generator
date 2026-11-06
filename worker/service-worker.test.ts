const mockClientsClaim = jest.fn();
const mockPrecacheAndRoute = jest.fn();
const mockCleanupOutdatedCaches = jest.fn();
const mockGetCacheKeyForURL = jest.fn((url: string) => `${url}?__WB_REVISION__=current`);
const mockRegisterRoute = jest.fn();
const mockNetworkFirst = jest.fn();
const mockExpirationPlugin = jest.fn();

jest.mock('workbox-core', () => ({
  cacheNames: { precache: 'workbox-precache-current' },
  clientsClaim: mockClientsClaim,
}));
jest.mock('workbox-precaching', () => ({
  precacheAndRoute: mockPrecacheAndRoute,
  cleanupOutdatedCaches: mockCleanupOutdatedCaches,
  getCacheKeyForURL: mockGetCacheKeyForURL,
}));
jest.mock('workbox-routing', () => ({ registerRoute: mockRegisterRoute }));
jest.mock('workbox-strategies', () => ({ NetworkFirst: mockNetworkFirst }));
jest.mock('workbox-expiration', () => ({ ExpirationPlugin: mockExpirationPlugin }));

describe('production service worker', () => {
  const manifest = [{ url: '/en', revision: 'page-v1' }, { url: 'app.js', revision: 'asset-v1' }];
  let listener: (event: { data: unknown; ports: unknown[] }) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(self, { __WB_MANIFEST: manifest });
    const addListener = jest.spyOn(self, 'addEventListener');
    jest.isolateModules(() => require('./service-worker.js'));
    listener = addListener.mock.calls.find(([type]) => type === 'message')![1] as typeof listener;
    addListener.mockRestore();
  });

  afterEach(() => {
    self.removeEventListener('message', listener as EventListener);
    delete (self as unknown as { __WB_MANIFEST?: unknown }).__WB_MANIFEST;
  });

  it('initializes the injected precache and bounded runtime cache', () => {
    expect(mockPrecacheAndRoute).toHaveBeenCalledWith(manifest);
    expect(mockCleanupOutdatedCaches).toHaveBeenCalledTimes(1);
    expect(mockClientsClaim).toHaveBeenCalledTimes(1);
    expect(mockExpirationPlugin).toHaveBeenCalledWith({ maxEntries: 200 });
    expect(mockNetworkFirst).toHaveBeenCalledWith({
      cacheName: 'offlineCache', plugins: [expect.any(mockExpirationPlugin)],
    });
    expect(mockRegisterRoute).toHaveBeenCalledWith(
      expect.any(Function), expect.any(mockNetworkFirst), 'GET',
    );
  });

  it('limits runtime GET routing to the same origin', () => {
    const match = mockRegisterRoute.mock.calls[0][0];
    expect(match({ url: new URL('/uncached', self.location.origin) })).toBe(true);
    expect(match({ url: new URL('https://external.example/uncached') })).toBe(false);
  });

  it('returns only current manifest keys with the active precache name', () => {
    const postMessage = jest.fn();
    listener({ data: { type: 'OFFLINE_CACHE_INFO' }, ports: [{ postMessage }] });
    const page = new URL('/en', self.location.origin).href;
    const asset = new URL('/app.js', self.location.origin).href;
    expect(postMessage).toHaveBeenCalledWith({
      cacheName: 'workbox-precache-current',
      keys: { [page]: `${page}?__WB_REVISION__=current`, [asset]: `${asset}?__WB_REVISION__=current` },
    });
    expect(mockGetCacheKeyForURL.mock.calls).toEqual([[page], [asset]]);
  });

  it.each([null, {}, { type: 'UNKNOWN' }])('ignores unrelated message data %p', data => {
    const postMessage = jest.fn();
    listener({ data, ports: [{ postMessage }] });
    expect(postMessage).not.toHaveBeenCalled();
    expect(mockGetCacheKeyForURL).not.toHaveBeenCalled();
  });

  it('ignores requests without a response port', () => {
    listener({ data: { type: 'OFFLINE_CACHE_INFO' }, ports: [] });
    expect(mockGetCacheKeyForURL).not.toHaveBeenCalled();
  });
});
