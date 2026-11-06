const { activeCacheIsComplete } = require('./cacheIntegrity');

let first: { onmessage: ((event: { data: unknown }) => Promise<void>) | null; close: jest.Mock };
let second: { close: jest.Mock };
let match: jest.Mock;
let active: { postMessage: jest.Mock };
let info: { cacheName: string; keys: Record<string, unknown> };
const page = 'https://bingo.test/en';
const asset = 'https://bingo.test/app.js';
const response = (html: string, type: string | null = 'text/html', ok = true) => ({ ok, headers: { get: () => type }, text: async () => html });

beforeEach(() => {
  jest.useFakeTimers();
  first = { onmessage: null, close: jest.fn() }; second = { close: jest.fn() };
  Object.defineProperty(globalThis, 'MessageChannel', { configurable: true, value: jest.fn(() => ({ port1: first, port2: second })) });
  info = { cacheName: 'previous', keys: { [page]: 'page-key', [asset]: 'asset-key' } };
  match = jest.fn(async key => key === 'page-key' ? response('<script src="/app.js?dpl=old"></script>') : response('', null));
  Object.defineProperty(globalThis, 'caches', { configurable: true, value: { open: jest.fn().mockResolvedValue({ match }) } });
  active = { postMessage: jest.fn(() => { void first.onmessage!({ data: info }); }) };
});
afterEach(() => { expect(jest.getTimerCount()).toBe(0); jest.useRealTimers(); });

it('verifies every previous entry and deployment-tagged HTML asset', async () => {
  await expect(activeCacheIsComplete(active)).resolves.toBe(true);
  expect(match.mock.calls).toEqual([['page-key'], ['asset-key']]);
  expect(first.close).toHaveBeenCalledTimes(1);
  expect(second.close).toHaveBeenCalledTimes(1);
});
it.each([undefined, response('', null, false)])('rejects missing or failed cache entries: %p', async missing => {
  match.mockResolvedValue(missing);
  await expect(activeCacheIsComplete(active)).resolves.toBe(false);
});
it.each([null, {}, { cacheName: 4 }, { cacheName: 'old', keys: null }, { cacheName: 'old', keys: 7 }, { cacheName: 'old', keys: { [page]: undefined } }])('rejects invalid previous manifests: %p', async data => {
  active.postMessage.mockImplementation(() => { void first.onmessage!({ data }); });
  await expect(activeCacheIsComplete(active)).resolves.toBe(false);
});
it.each(['no scripts', 'unknown asset', 'non-HTML cache'])('rejects unusable HTML: %s', async state => {
  match.mockResolvedValue(response(state === 'no scripts' ? '<p>Page</p>' : '<link href="/missing.css">', state === 'non-HTML cache' ? 'application/javascript' : 'text/html'));
  await expect(activeCacheIsComplete(active)).resolves.toBe(false);
});
it('decodes HTML ampersands without dropping meaningful query parameters', async () => {
  info.keys = { [page]: 'page-key', [`${asset}?kind=game&v=2`]: 'asset-key' };
  match.mockImplementation(async key => key === 'page-key' ? response('<script src="/app.js?kind=game&amp;v=2&dpl=old"></script>') : response('', 'application/javascript'));
  await expect(activeCacheIsComplete(active)).resolves.toBe(true);
});
it('treats blocked cache access as unavailable', async () => {
  jest.mocked(caches.open).mockRejectedValue(new Error('blocked'));
  await expect(activeCacheIsComplete(active)).resolves.toBe(false);
});
it('bounds legacy workers that do not answer and ignores a late reply', async () => {
  active.postMessage.mockImplementation(() => {});
  const result = activeCacheIsComplete(active);
  await jest.advanceTimersByTimeAsync(2000);
  await expect(result).resolves.toBe(false);
  await first.onmessage!({ data: info });
  expect(first.close).toHaveBeenCalledTimes(1);
});
it('handles failed worker communication', async () => {
  active.postMessage.mockImplementation(() => { throw new Error('worker stopped'); });
  await expect(activeCacheIsComplete(active)).resolves.toBe(false);
});

it('does not classify a healthy slow cache as a legacy worker', async () => {
  let resolve!: (value: unknown) => void;
  match.mockReturnValueOnce(new Promise(yes => { resolve = yes; }));
  const result = activeCacheIsComplete(active);
  await jest.advanceTimersByTimeAsync(3000);
  expect(first.close).not.toHaveBeenCalled();
  resolve(response('<script src="/app.js"></script>'));
  await expect(result).resolves.toBe(true);
});
it('keeps the waiting lifecycle when protocol-capable cache inspection stalls', async () => {
  let resolve!: (value: unknown) => void;
  match.mockReturnValueOnce(new Promise(yes => { resolve = yes; }));
  const result = activeCacheIsComplete(active);
  await jest.advanceTimersByTimeAsync(10_000);
  await expect(result).resolves.toBe(true);
  resolve(response('<script src="/app.js"></script>'));
  await jest.advanceTimersByTimeAsync(0);
  expect(first.close).toHaveBeenCalledTimes(1);
});
