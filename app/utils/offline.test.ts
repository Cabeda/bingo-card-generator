import { prepareOffline } from './offline';
import { OFFLINE_ROUTES } from './offlineRoutes';

const html = '<script src="/app.js"></script><link rel="stylesheet" href="./style.css">';
const response = (body = html, ok = true, type: string | null = 'text/html') => ({
  ok, headers: { get: () => type }, text: async () => body, clone: () => response(body, ok, type),
});
let match: jest.Mock;
let register: jest.Mock;
let getRegistration: jest.Mock;
let persist: jest.Mock;
let fetchMock: jest.Mock;
let put: jest.Mock;
let open: jest.Mock;
let info: { cacheName: string; keys: Record<string, string> };
let postMessage: jest.Mock;
let repaired: Map<string, ReturnType<typeof response>>;
let port1: { onmessage: ((event: { data: unknown }) => void) | null; close: jest.Mock };
let port2: { close: jest.Mock };

beforeEach(() => {
  jest.useFakeTimers();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  fetchMock = jest.fn().mockResolvedValue(response());
  repaired = new Map();
  put = jest.fn(async (key: string, value: ReturnType<typeof response>) => { repaired.set(key, value); });
  open = jest.fn();
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });
  const urls = [...OFFLINE_ROUTES, '/app.js', '/manifest.json', '/icon-192x192.png', '/icon-384x384.png', '/icon-512x512.png', ...OFFLINE_ROUTES.map(route => new URL('./style.css', new URL(route, location.origin)).pathname)];
  info = { cacheName: 'active-precache-v1', keys: Object.fromEntries(urls.map(path => { const url = new URL(path, location.origin).href; return [url, `${url}?__WB_REVISION__=active`]; })) };
  port1 = { onmessage: null, close: jest.fn() };
  port2 = { close: jest.fn() };
  Object.defineProperty(globalThis, 'MessageChannel', { configurable: true, value: jest.fn(() => ({ port1, port2 })) });
  postMessage = jest.fn(async (data: { type: string; url?: string }) => {
    if (data.type === 'OFFLINE_CACHE_INFO') return port1.onmessage!({ data: info });
    try {
      const url = new URL(data.url!);
      url.searchParams.delete('dpl');
      const fresh = await fetchMock(url.href, { cache: 'reload' });
      if (fresh.ok) await put(info.keys[url.href], fresh.clone());
      port1.onmessage!({ data: { ok: fresh.ok } });
    } catch { port1.onmessage!({ data: { ok: false } }); }
  });
  match = jest.fn(async (url: string) => response(OFFLINE_ROUTES.includes(new URL(url).pathname) ? html : 'asset'));
  register = jest.fn().mockResolvedValue({});
  getRegistration = jest.fn().mockResolvedValue(undefined);
  persist = jest.fn().mockResolvedValue(true);
  open.mockResolvedValue({ match, put });
  Object.defineProperty(globalThis, 'caches', { configurable: true, value: { match: jest.fn(() => { throw new Error('Global caches must not be trusted'); }), open } });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register, getRegistration, ready: Promise.resolve({ active: { postMessage } }) } });
  Object.defineProperty(navigator, 'storage', { configurable: true, value: { persist } });
});
afterEach(() => {
  expect(jest.getTimerCount()).toBe(0);
  jest.useRealTimers();
});

it('verifies every route, its scripts/styles and public files', async () => {
  await prepareOffline();
  expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  expect(register).toHaveBeenCalledTimes(1);
  for (const path of [...OFFLINE_ROUTES, '/app.js', '/en/style.css', '/manifest.json', '/icon-192x192.png', '/icon-384x384.png', '/icon-512x512.png']) {
    expect(match).toHaveBeenCalledWith(info.keys[new URL(path, location.origin).href]);
  }
  expect(persist).toHaveBeenCalledTimes(1);
});

it.each([
  ['missing', undefined], ['failed', response(html, false)], ['wrong MIME', response(html, true, 'application/json')],
  ['missing MIME', response(html, true, null)], ['no scripts', response('<p>Page</p>')],
  ['external script', response('<script src="https://external.test/app.js"></script>')],
  ['external stylesheet', response('<script src="/app.js"></script><link rel="stylesheet" href="https://external.test/style.css">')],
])('rejects a %s page', async (_, invalid) => {
  match.mockImplementation(async (url: string) => new URL(url).pathname === '/fr/game' ? invalid : response());
  await expect(prepareOffline()).rejects.toThrow();
  expect(persist).not.toHaveBeenCalled();
});

it.each([undefined, response('', false)])('rejects a missing or failed required asset', async invalid => {
  match.mockImplementation(async (url: string) => new URL(url).pathname === '/app.js' ? invalid : response());
  await expect(prepareOffline()).rejects.toThrow('Offline asset unavailable');
});

it('propagates registration failure', async () => {
  register.mockRejectedValue(new Error('registration failed'));
  await expect(prepareOffline()).rejects.toThrow('registration failed');
});

it('bounds waiting for service worker readiness', async () => {
  Object.defineProperty(navigator.serviceWorker, 'ready', { value: new Promise(() => {}) });
  const prepared = expect(prepareOffline()).rejects.toThrow('timed out');
  await jest.advanceTimersByTimeAsync(30_000);
  await prepared;
});

it.each(['missing storage', 'missing method', 'denied', 'error'])('accepts valid caches with persistence %s', async state => {
  if (state === 'missing storage') Object.defineProperty(navigator, 'storage', { value: undefined });
  if (state === 'missing method') Object.defineProperty(navigator, 'storage', { value: {} });
  if (state === 'denied') persist.mockResolvedValue(false);
  if (state === 'error') persist.mockRejectedValue(new Error('unavailable'));
  await expect(prepareOffline()).resolves.toBeUndefined();
});

it('uses an installed registration without registering again offline', async () => {
  getRegistration.mockResolvedValue({ active: {} });
  await prepareOffline();
  expect(getRegistration).toHaveBeenCalledWith('/');
  expect(register).not.toHaveBeenCalled();
});

it('propagates registration lookup failure', async () => {
  getRegistration.mockRejectedValue(new Error('lookup failed'));
  await expect(prepareOffline()).rejects.toThrow('lookup failed');
  expect(register).not.toHaveBeenCalled();
});

it('recovers missing pages and essential assets online before reporting ready', async () => {
  Object.defineProperty(navigator, 'onLine', { value: true });
  match.mockImplementation(async (key: string) => repaired.get(key));
  await prepareOffline();
  expect(postMessage).toHaveBeenCalledWith({ type: 'OFFLINE_REPAIR', url: new URL('/fr/game', location.origin).href }, [port2]);
  expect(fetchMock).toHaveBeenCalledWith(new URL('/fr/game', location.origin).href, { cache: 'reload' });
  expect(fetchMock).toHaveBeenCalledWith(new URL('/app.js', location.origin).href, { cache: 'reload' });
  expect(open).toHaveBeenCalledWith('active-precache-v1');
  expect(put).toHaveBeenCalledWith(info.keys[new URL('/app.js', location.origin).href], expect.objectContaining({ ok: true }));
  expect(put).toHaveBeenCalledTimes(fetchMock.mock.calls.length);
  expect(persist).toHaveBeenCalledTimes(1);
});

it('does not fetch missing pages while offline', async () => {
  match.mockResolvedValue(undefined);
  await expect(prepareOffline()).rejects.toThrow('Offline page unavailable');
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each(['fetch rejection', 'bad response', 'cache write failure'])('rejects unsuccessful recovery: %s', async failure => {
  Object.defineProperty(navigator, 'onLine', { value: true });
  match.mockResolvedValue(undefined);
  if (failure === 'fetch rejection') fetchMock.mockRejectedValue(new Error('network error'));
  if (failure === 'bad response') fetchMock.mockResolvedValue(response('', false));
  if (failure === 'cache write failure') put.mockRejectedValue(new Error('quota exceeded'));
  await expect(prepareOffline()).rejects.toThrow();
  expect(persist).not.toHaveBeenCalled();
});

it('rejects cached failures online instead of accepting a fresh response', async () => {
  Object.defineProperty(navigator, 'onLine', { value: true });
  match.mockResolvedValue(response('', false));
  await expect(prepareOffline()).rejects.toThrow('Offline page unavailable');
  expect(fetchMock).not.toHaveBeenCalled();
});

it('does not wait for persistence to settle', async () => {
  persist.mockReturnValue(new Promise(() => {}));
  await expect(prepareOffline()).resolves.toBeUndefined();
});

it('ignores a synchronous persistence failure', async () => {
  persist.mockImplementation(() => { throw new Error('storage unavailable'); });
  await expect(prepareOffline()).resolves.toBeUndefined();
});

it('asks the ready active worker for exact serving keys and closes the channel', async () => {
  await prepareOffline();
  expect(postMessage).toHaveBeenCalledWith({ type: 'OFFLINE_CACHE_INFO' }, [port2]);
  expect(port1.close).toHaveBeenCalledTimes(1);
  expect(port2.close).toHaveBeenCalledTimes(1);
  expect(caches.match).not.toHaveBeenCalled();
});

it('rejects absent active-cache entries even if unrelated caches contain them', async () => {
  jest.mocked(caches.match).mockResolvedValue(response() as unknown as Response);
  match.mockResolvedValue(undefined);
  await expect(prepareOffline()).rejects.toThrow('Offline page unavailable');
  expect(caches.match).not.toHaveBeenCalled();
});

it('rejects resources absent from the active worker manifest without fetching', async () => {
  Object.defineProperty(navigator, 'onLine', { value: true });
  delete info.keys[new URL('/app.js', location.origin).href];
  await expect(prepareOffline()).rejects.toThrow('not in the active offline manifest');
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each([null, { cacheName: 1, keys: {} }, { cacheName: 'active' }, { cacheName: 'active', keys: 'bad' }])('rejects malformed worker cache information: %s', async data => {
  postMessage.mockImplementation(() => port1.onmessage!({ data }));
  await expect(prepareOffline()).rejects.toThrow('Invalid active offline cache information');
  expect(port1.close).toHaveBeenCalled();
});

it('bounds unanswered worker RPC and closes its ports', async () => {
  postMessage.mockImplementation(() => {});
  const prepared = expect(prepareOffline()).rejects.toThrow('timed out');
  await jest.advanceTimersByTimeAsync(30_000);
  await prepared;
  expect(port1.close).toHaveBeenCalled();
  expect(port2.close).toHaveBeenCalled();
});

it('does not create a channel or verify caches when readiness resolves after timeout', async () => {
  let resolveReady!: (registration: ServiceWorkerRegistration) => void;
  const ready = new Promise<ServiceWorkerRegistration>(resolve => { resolveReady = resolve; });
  Object.defineProperty(navigator.serviceWorker, 'ready', { value: ready });
  const prepared = expect(prepareOffline()).rejects.toThrow('timed out');
  await jest.advanceTimersByTimeAsync(30_000);
  await prepared;
  resolveReady({ active: { postMessage } } as unknown as ServiceWorkerRegistration);
  await Promise.resolve();
  await Promise.resolve();
  expect(MessageChannel).not.toHaveBeenCalled();
  expect(open).not.toHaveBeenCalled();
  expect(persist).not.toHaveBeenCalled();
});

it('verifies deployment-tagged scripts and styles against their canonical manifest keys', async () => {
  const script = new URL('/_next/static/chunks/app.js', location.origin).href;
  const style = new URL('/_next/static/css/app.css', location.origin).href;
  info.keys[script] = `${script}?__WB_REVISION__=script`;
  info.keys[style] = `${style}?__WB_REVISION__=style`;
  match.mockImplementation(async (url: string) => response(OFFLINE_ROUTES.includes(new URL(url).pathname)
    ? '<script src="/_next/static/chunks/app.js?dpl=production"></script><link rel="stylesheet" href="/_next/static/css/app.css?dpl=production">'
    : 'asset'));
  await expect(prepareOffline()).resolves.toBeUndefined();
  expect(match).toHaveBeenCalledWith(info.keys[script]);
  expect(match).toHaveBeenCalledWith(info.keys[style]);
});

it.each([null, {}, { ok: false }])('rejects unsuccessful worker repair replies: %p', async data => {
  Object.defineProperty(navigator, 'onLine', { value: true });
  match.mockResolvedValue(undefined);
  postMessage.mockImplementation((request: { type: string }) => port1.onmessage!({ data: request.type === 'OFFLINE_CACHE_INFO' ? info : data }));
  await expect(prepareOffline()).rejects.toThrow('Offline resource repair failed');
});
