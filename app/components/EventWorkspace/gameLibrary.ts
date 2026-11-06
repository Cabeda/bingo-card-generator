import { CardTheme } from "../../utils/bingo.interface";
import { isValidTheme } from "../../utils/themes";
import { EventSession, restoreSession } from "./session";

export const GAME_LIBRARY_DB = "bingoGameLibrary.v1";

export interface SavedGameSummary {
  id: string;
  name: string;
  cardCount: number;
  calledCount: number;
  started: boolean;
  updatedAt: number;
}

export interface SavedGame {
  id: string;
  updatedAt: number;
  session: EventSession;
  themeKey: string;
  theme: CardTheme;
}

/** One short-lived connection per transaction; resolve writes only after commit. */
function transact<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    let abandoned = false;
    const opening = indexedDB.open(GAME_LIBRARY_DB, 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore("games", { keyPath: "id" });
    opening.onerror = () => { abandoned = true; reject(opening.error); };
    opening.onblocked = () => { abandoned = true; reject(new Error("Game library upgrade blocked")); };
    opening.onsuccess = () => {
      const database = opening.result;
      if (abandoned) { database.close(); return; }
      try {
        const transaction = database.transaction("games", mode);
        const request = operation(transaction.objectStore("games"));
        transaction.oncomplete = () => { database.close(); resolve(request.result); };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error ?? new Error("Game library transaction aborted"));
        };
      } catch (error) {
        database.close();
        reject(error);
      }
    };
  });
}

function validate(value: unknown): SavedGame {
  const record = value as SavedGame | null;
  if (!record || typeof record.id !== "string" || !record.id ||
      typeof record.updatedAt !== "number" || !Number.isFinite(record.updatedAt) || record.updatedAt < 0 || record.updatedAt > 8.64e15 ||
      typeof record.themeKey !== "string" || !isValidTheme(record.theme)) {
    throw new Error("Invalid saved game");
  }
  return { ...record, session: { ...restoreSession(record.session), libraryId: record.id } };
}

function summary(record: SavedGame): SavedGameSummary {
  return {
    id: record.id, name: record.session.game!.filename,
    cardCount: record.session.game!.cards.length, calledCount: record.session.drawn.length,
    started: record.session.started, updatedAt: record.updatedAt,
  };
}

export async function listLocalGames(): Promise<{ games: SavedGameSummary[]; unreadable: number }> {
  const records = await transact<unknown[]>("readonly", store => store.getAll());
  const games: SavedGameSummary[] = [];
  let unreadable = 0;
  for (const record of records) {
    if ((record as { deleted?: boolean }).deleted === true) continue;
    try { games.push(summary(validate(record))); } catch { unreadable++; }
  }
  return { games: games.sort((a, b) => b.updatedAt - a.updatedAt), unreadable };
}

export async function saveLocalGame(id: string, session: EventSession, themeKey: string, theme: CardTheme, updatedAt = Date.now()): Promise<SavedGameSummary> {
  const record = validate({ id, updatedAt, session, themeKey, theme });
  let stored = record;
  let deleted = false;
  await transact("readwrite", store => {
    const request = store.get(id);
    request.onsuccess = () => {
      const previous = request.result as (SavedGame & { deleted?: boolean }) | undefined;
      if (previous?.deleted === true) { deleted = true; return; }
      if (previous && previous.updatedAt > updatedAt) stored = validate(previous);
      else store.put(record);
    };
    return request;
  });
  if (deleted) throw new Error("Saved copy was removed; save it again as a new game");
  return summary(stored);
}

export async function loadLocalGame(id: string): Promise<SavedGame> {
  const record = await transact<unknown>("readonly", store => store.get(id));
  return validate(record);
}

export async function removeLocalGame(id: string): Promise<void> {
  await transact("readwrite", store => store.put({ id, deleted: true }));
}
