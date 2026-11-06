const mockCopyResponse = jest.fn(async response => response);
const mockClientsClaim = jest.fn();
const mockPrecacheAndRoute = jest.fn();
const mockCleanupOutdatedCaches = jest.fn();
const mockMatchPrecache = jest.fn();
const mockHandleNavigation = jest.fn();
const mockGetCacheKeyForURL = jest.fn((url: string) => `${url}?__WB_REVISION__=current`);
const mockRegisterRoute = jest.fn();
const mockNetworkFirst = jest.fn();
const mockExpirationPlugin = jest.fn();

jest.mock('workbox-core', () => ({
  cacheNames: { precache: 'workbox-precache-current' },
  clientsClaim: mockClientsClaim,
  copyResponse: mockCopyResponse,
}));
jest.mock('workbox-precaching', () => ({
  precacheAndRoute: mockPrecacheAndRoute,
  cleanupOutdatedCaches: mockCleanupOutdatedCaches,
  getCacheKeyForURL: mockGetCacheKeyForURL,
  matchPrecache: mockMatchPrecache,
}));
jest.mock('workbox-routing', () => ({ registerRoute: mockRegisterRoute }));
jest.mock('workbox-strategies', () => ({ NetworkFirst: mockNetworkFirst }));
jest.mock('workbox-expiration', () => ({ ExpirationPlugin: mockExpirationPlugin }));
mockNetworkFirst.prototype.handle = mockHandleNavigation;

describe('production service worker', () => {
  const manifest = [{ url: '/en', revision: 'page-v1' }, { url: 'app.js', revision: 'asset-v1' }];
  let listener: (event: { data: unknown; ports: unknown[]; waitUntil?: (promise: Promise<unknown>) => void }) => void;
  let activate: (event: { waitUntil: (promise: Promise<unknown>) => void }) => void;
  let install: (event: { waitUntil: (promise: Promise<unknown>) => void }) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(self, { __WB_MANIFEST: manifest, registration: { active: null }, skipWaiting: jest.fn().mockResolvedValue(undefined) });
    const addListener = jest.spyOn(self, 'addEventListener');
    jest.isolateModules(() => require('./service-worker.js'));
    listener = addListener.mock.calls.find(([type]) => type === 'message')![1] as typeof listener;
    install = addListener.mock.calls.find(([type]) => type === 'install')![1] as typeof install;
    activate = addListener.mock.calls.find(([type]) => type === 'activate')![1] as typeof activate;
    addListener.mockRestore();
  });

  afterEach(() => {
    self.removeEventListener('message', listener as EventListener);
    self.removeEventListener('install', install as EventListener);
    self.removeEventListener('activate', activate as EventListener);
    delete (self as unknown as { __WB_MANIFEST?: unknown }).__WB_MANIFEST;
  });

  it('initializes the injected precache and bounded runtime cache', () => {
    expect(mockPrecacheAndRoute).toHaveBeenCalledWith(manifest, { ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^dpl$/] });
    expect(mockCleanupOutdatedCaches).toHaveBeenCalledTimes(1);
    expect(mockNetworkFirst.mock.calls[0][0].cacheName).toBe('bingo-navigation-v1-page-v1');
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
    const match = mockRegisterRoute.mock.calls[1][0];
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

  it.each([null, {}])('activates a completed installation with previous worker %p', async active => {
    Object.assign(self, { registration: { active } });
    const waitUntil = jest.fn(); install({ waitUntil });
    await waitUntil.mock.calls[0][0];
    expect(self.skipWaiting).toHaveBeenCalledTimes(1);
  });
  it.each(['ok', 'redirected', 'failed', 'missing key', 'network error'])('repairs precached resources: %s', async state => {
    const put = jest.fn().mockResolvedValue(undefined);
    const response = { ok: state !== 'failed', redirected: state === 'redirected' };
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: jest.fn().mockResolvedValue(response) });
    Object.defineProperty(globalThis, 'caches', { configurable: true, value: { open: jest.fn().mockResolvedValue({ put }) } });
    if (state === 'missing key') mockGetCacheKeyForURL.mockReturnValueOnce(undefined as unknown as string);
    if (state === 'network error') jest.mocked(fetch).mockRejectedValueOnce(new Error('network'));
    const postMessage = jest.fn(); const waitUntil = jest.fn();
    listener({ data: { type: 'OFFLINE_REPAIR', url: '/en?dpl=deployment' }, ports: [{ postMessage }], waitUntil });
    await waitUntil.mock.calls[0][0];
    expect(postMessage).toHaveBeenCalledWith({ ok: state === 'ok' || state === 'redirected' });
    if (state === 'ok' || state === 'redirected') expect(put).toHaveBeenCalledTimes(1);
    expect(mockCopyResponse).toHaveBeenCalledTimes(state === 'redirected' ? 1 : 0);
  });
  it('ignores repair requests without a response port', () => {
    listener({ data: { type: 'OFFLINE_REPAIR', url: '/en' }, ports: [] });
    expect(mockGetCacheKeyForURL).not.toHaveBeenCalled();
  });

  it('serves online navigation before considering a precached page', async () => {
    const [matches, handler] = mockRegisterRoute.mock.calls[0];
    expect(matches({ request: { mode: 'navigate' }, url: new URL('/en', self.location.origin) })).toBe(true);
    expect(matches({ request: { mode: 'cors' }, url: new URL('/en', self.location.origin) })).toBe(false);
    expect(matches({ request: { mode: 'navigate' }, url: new URL('https://external.example/en') })).toBe(false);
    const response = { status: 200, text: 'new deployment' };
    mockHandleNavigation.mockResolvedValueOnce(response);
    const request = { url: self.location.origin + '/en' };
    const event = {};
    expect(await handler({ request, event })).toBe(response);
    expect(mockHandleNavigation).toHaveBeenCalledWith({ request, event });
    expect(mockMatchPrecache).not.toHaveBeenCalled();
  });
  it.each([true, false])('uses installed HTML when network and navigation cache are unavailable (cached=%s)', async cached => {
    const handler = mockRegisterRoute.mock.calls[0][1];
    const offline = new Error('Offline');
    mockHandleNavigation.mockRejectedValueOnce(offline);
    const response = cached ? { status: 200 } : undefined;
    mockMatchPrecache.mockResolvedValueOnce(response);
    const result = handler({ event: {}, request: { url: self.location.origin + '/pt/cards?utm_source=message' } });
    if (cached) expect(await result).toBe(response);
    else await expect(result).rejects.toBe(offline);
    expect(mockMatchPrecache).toHaveBeenCalledWith('/pt/cards');
  });

  it('removes obsolete navigation HTML while preserving this build and unrelated caches', async () => {
    const remove = jest.fn().mockResolvedValue(true);
    Object.defineProperty(globalThis, 'caches', { configurable: true, value: {
      keys: jest.fn().mockResolvedValue(['bingo-navigation-v1-previous', 'bingo-navigation-v1-page-v1', 'bingo-navigation-v1', 'offlineCache', 'workbox-precache-current']),
      delete: remove,
    } });
    const waitUntil = jest.fn();
    activate({ waitUntil });
    await waitUntil.mock.calls[0][0];
    expect(remove.mock.calls).toEqual([['bingo-navigation-v1-previous'], ['bingo-navigation-v1']]);
  });

});
