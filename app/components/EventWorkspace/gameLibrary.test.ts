import { deserialize, serialize } from 'node:v8';
import { IDBDatabase, IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { loadGameFile } from '../../utils/gameFiles';
import { PRESET_THEMES } from '../../utils/themes';
import { GAME_LIBRARY_DB, listLocalGames, loadLocalGame, removeLocalGame, saveLocalGame } from './gameLibrary';
import { emptySession } from './session';

const game = loadGameFile('Family.bingoCards', '|CardNo.7;1;;21;31;;51;;71;;2;12;;;42;;62;;82;;13;23;33;;53;;73;');
const session = { ...emptySession, game, drawn: [1, 90], paused: true, target: 'full' as const, stage: 'host' as const, started: true, cardsPerPage: 2 };
const originalClone = globalThis.structuredClone;
beforeAll(() => { Object.defineProperty(globalThis, 'structuredClone', { configurable: true, value: (value: unknown) => deserialize(serialize(value)) }); });
afterAll(() => { Object.defineProperty(globalThis, 'structuredClone', { configurable: true, value: originalClone }); });
beforeEach(() => { Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() }); });
afterEach(() => jest.restoreAllMocks());

it('saves separate games with duplicate names, orders recent saves and restores all gameplay state', async () => {
  expect(await listLocalGames()).toEqual({ games: [], unreadable: 0 });
  const first = await saveLocalGame('first', session, 'classic', PRESET_THEMES.classic, 10);
  await saveLocalGame('second', { ...session, drawn: [1] }, 'modern', PRESET_THEMES.modern, 20);
  expect(first).toEqual({ id: 'first', name: 'Family', cardCount: 1, calledCount: 2, started: true, updatedAt: 10 });
  expect((await listLocalGames()).games.map(item => item.id)).toEqual(['second', 'first']);
  const restored = await loadLocalGame('first');
  expect(restored.session).toEqual({ ...session, libraryId: 'first' });
  expect(restored.theme).toEqual(PRESET_THEMES.classic);
  await removeLocalGame('second');
  expect((await listLocalGames()).games.map(item => item.id)).toEqual(['first']);
  await removeLocalGame('missing');
  await expect(loadLocalGame('missing')).rejects.toThrow('Invalid saved game');
});
it('keeps the newest committed progress when an older queued snapshot arrives late', async () => {
  await saveLocalGame('same', session, 'classic', PRESET_THEMES.classic, 30);
  const older = await saveLocalGame('same', { ...session, drawn: [] }, 'classic', PRESET_THEMES.classic, 20);
  expect(older.calledCount).toBe(2);
  expect((await loadLocalGame('same')).session.drawn).toEqual([1, 90]);
  await saveLocalGame('same', { ...session, drawn: [1] }, 'classic', PRESET_THEMES.classic, 40);
  expect((await loadLocalGame('same')).session.drawn).toEqual([1]);
});
it('defaults to the current save time and keeps print preferences with the deck', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(1234);
  const printOptions = { inkSaving: true, footer: 'Local night', logo: 'data:image/png;base64,AA==', largeNumbers: true, borders: 'none' as const };
  expect((await saveLocalGame('options', { ...session, printOptions }, 'classic', PRESET_THEMES.classic)).updatedAt).toBe(1234);
  expect((await loadLocalGame('options')).session.printOptions).toEqual(printOptions);
});
it('rejects invalid sessions without replacing an existing saved deck', async () => {
  await saveLocalGame('safe', session, 'classic', PRESET_THEMES.classic, 10);
  await expect(saveLocalGame('safe', { ...session, drawn: [0] }, 'classic', PRESET_THEMES.classic, 20)).rejects.toThrow();
  expect((await loadLocalGame('safe')).session.drawn).toEqual([1, 90]);
});
it('reports unreadable records without removing them or hiding readable games', async () => {
  await saveLocalGame('safe', session, 'classic', PRESET_THEMES.classic, 10);
  const valid = { id: 'x', updatedAt: 1, session, themeKey: 'classic', theme: PRESET_THEMES.classic };
  const bad = [
    { ...valid, id: 7 }, { ...valid, id: '' }, { ...valid, id: 'time-text', updatedAt: 'wrong' },
    { ...valid, id: 'time-infinity', updatedAt: Infinity }, { ...valid, id: 'time-negative', updatedAt: -1 },
    { ...valid, id: 'time-large', updatedAt: 1e20 }, { ...valid, id: 'theme-key', themeKey: 4 },
    { ...valid, id: 'theme', theme: {} }, { ...valid, id: 'session', session: {} },
  ];
  await new Promise<void>((resolve, reject) => {
    const opening = indexedDB.open(GAME_LIBRARY_DB, 1);
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const db = opening.result; const tx = db.transaction('games', 'readwrite');
      for (const record of bad) tx.objectStore('games').put(record);
      tx.oncomplete = () => { db.close(); resolve(); };
    };
  });
  const result = await listLocalGames();
  expect(result.games.map(item => item.id)).toEqual(['safe']);
  expect(result.unreadable).toBe(bad.length);
  await expect(loadLocalGame('theme')).rejects.toThrow('Invalid saved game');
  expect((await listLocalGames()).unreadable).toBe(bad.length);
});
it('handles a browser that does not expose IndexedDB', async () => {
  Object.defineProperty(globalThis, 'indexedDB', { value: undefined });
  await expect(listLocalGames()).rejects.toThrow();
});
it('reports database opening errors', async () => {
  const request = { error: new Error('storage blocked'), onerror: null as unknown as () => void };
  jest.spyOn(indexedDB, 'open').mockReturnValue(request as unknown as IDBOpenDBRequest);
  const listing = listLocalGames(); request.onerror();
  await expect(listing).rejects.toThrow('storage blocked');
});
it('closes a late database connection after a blocked upgrade without performing a write', async () => {
  const close = jest.fn(); const transaction = jest.fn();
  const request = { result: { close, transaction }, onblocked: null as unknown as () => void, onsuccess: null as unknown as () => void };
  jest.spyOn(indexedDB, 'open').mockReturnValue(request as unknown as IDBOpenDBRequest);
  const listing = listLocalGames(); request.onblocked();
  await expect(listing).rejects.toThrow('upgrade blocked');
  request.onsuccess();
  expect(close).toHaveBeenCalledTimes(1); expect(transaction).not.toHaveBeenCalled();
});
it('closes the connection if a transaction cannot begin', async () => {
  await listLocalGames();
  jest.spyOn(IDBDatabase.prototype, 'transaction').mockImplementation(() => { throw new Error('transaction unavailable'); });
  await expect(listLocalGames()).rejects.toThrow('transaction unavailable');
});
it('rejects aborted writes instead of reporting success', async () => {
  const original = IDBObjectStore.prototype.put;
  jest.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value) {
    const request = original.call(this, value); this.transaction.abort(); return request;
  });
  await expect(saveLocalGame('aborted', session, 'classic', PRESET_THEMES.classic)).rejects.toThrow('transaction aborted');
  expect((await listLocalGames()).games).toEqual([]);
});
it('preserves saved progress after a failed replacement transaction', async () => {
  await saveLocalGame('safe', session, 'classic', PRESET_THEMES.classic, 10);
  jest.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value) { return this.add(value); });
  await expect(saveLocalGame('safe', { ...session, drawn: [] }, 'classic', PRESET_THEMES.classic, 20)).rejects.toMatchObject({ name: 'ConstraintError' });
  expect((await loadLocalGame('safe')).session.drawn).toEqual([1, 90]);
});

it('keeps a persistent deletion marker so another tab cannot recreate a removed saved copy', async () => {
  await saveLocalGame('removed', session, 'classic', PRESET_THEMES.classic, 1);
  await removeLocalGame('removed');
  await expect(saveLocalGame('removed', session, 'classic', PRESET_THEMES.classic, 100)).rejects.toThrow('Saved copy was removed');
  expect(await listLocalGames()).toEqual({ games: [], unreadable: 0 });
  await saveLocalGame('new-copy', session, 'classic', PRESET_THEMES.classic, 101);
  expect((await listLocalGames()).games.map(item => item.id)).toEqual(['new-copy']);
});
