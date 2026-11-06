import { loadGameFile, saveGameFile } from './gameFiles';
import { Game } from './bingo.interface';
import { createGameId } from './types';
import { generateSharedCardsV1 } from './shareGeneratorV1';

export const MAX_SHARE_LENGTH = 8000;
const prefix = '#bingo=';
async function digest(text: string): Promise<string> {
  return base64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))).slice(0, 16));
}
async function seal(payload: unknown): Promise<string> {
  const data = base64(new TextEncoder().encode(JSON.stringify(payload)));
  const link = `${prefix}${data}.${await digest(data)}`;
  if (link.length > MAX_SHARE_LENGTH) throw new Error('Game too large for a link');
  return link;
}
export async function sharedGameKey(game: Game): Promise<string> {
  return 'bingoShared.v1.' + await digest(JSON.stringify([game.filename, game.cards.map(c => [c.cardNumber, c.numbers])]));
}

function base64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function unbase64(text: string): Uint8Array<ArrayBuffer> {
  if (!/^[\w-]+$/.test(text)) throw new Error('Invalid encoding');
  const bytes = Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));
  if (base64(bytes) !== text) throw new Error('Invalid encoding');
  return bytes;
}
function validate(name: unknown, count: unknown): asserts name is string {
  if (typeof name !== 'string' || !name.trim() || new TextEncoder().encode(name).length > 320 ||
    !Number.isInteger(count) || (count as number) < 1 || (count as number) > 1000) throw new Error('Invalid game');
}
export async function createSharedGame(name: string, count: number, seed = base64(crypto.getRandomValues(new Uint8Array(16)))): Promise<Game> {
  validate(name, count);
  const bytes = unbase64(seed);
  if (bytes.length !== 16) throw new Error('Invalid seed');
  return { filename: createGameId(name), cards: await generateSharedCardsV1(bytes, count), generation: { version: 1, seed } };
}

/** Only immutable game contents enter a link; never serialize a session. */
export async function encodeGameLink(game: Game): Promise<string> {
  validate(game.filename, game.cards.length);
  if (game.generation?.version === 1) {
    const regenerated = await createSharedGame(game.filename, game.cards.length, game.generation.seed);
    if (JSON.stringify(regenerated.cards.map(c => [c.cardNumber, c.numbers])) === JSON.stringify(game.cards.map(c => [c.cardNumber, c.numbers]))) {
      return seal([1, game.filename, game.cards.length, game.generation.seed]);
    }
  }
  const checked = loadGameFile(`${game.filename}.bingoCards`, saveGameFile(game));
  const bytes = new Uint8Array(checked.cards.length * 17);
  checked.cards.forEach((card, index) => {
    let bit = index * 136;
    const write = (value: number, width: number): void => {
      for (let shift = width - 1; shift >= 0; shift--, bit++) bytes[bit >> 3] |= ((value >> shift) & 1) << (7 - bit % 8);
    };
    card.numbers.forEach(n => write(n === null ? 0 : 1, 1));
    card.numbers.forEach(n => { if (n !== null) write(n, 7); });
  });
  return seal([2, game.filename, checked.cards.map(c => c.cardNumber), base64(bytes)]);
}
export async function decodeGameLink(hash: string): Promise<Game> {
  if (!hash.startsWith(prefix) || hash.length > MAX_SHARE_LENGTH) throw new Error('Invalid link');
  const parts = hash.slice(prefix.length).split('.');
  if (parts.length !== 2 || await digest(parts[0]) !== parts[1]) throw new Error('Damaged link');
  const payload: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(unbase64(parts[0])));
  if (!Array.isArray(payload) || payload.length !== 4 || typeof payload[3] !== 'string') throw new Error('Unsupported link');
  if (payload[0] === 1) return createSharedGame(payload[1], payload[2], payload[3]);
  if (payload[0] !== 2 || !Array.isArray(payload[2])) throw new Error('Unsupported link');
  validate(payload[1], payload[2].length);
  const bytes = unbase64(payload[3]);
  if (bytes.length !== payload[2].length * 17) throw new Error('Invalid cards');
  const records = payload[2].map((id: unknown, index: number) => {
    if (!Number.isSafeInteger(id) || (id as number) < 1) throw new Error('Invalid card ID');
    let bit = index * 136;
    const read = (width: number): number => {
      let value = 0;
      for (let i = 0; i < width; i++, bit++) value = (value << 1) | ((bytes[bit >> 3] >> (7 - bit % 8)) & 1);
      return value;
    };
    const mask = Array.from({ length: 27 }, () => read(1));
    if (mask.reduce((a, b) => a + b, 0) !== 15) throw new Error('Invalid grid');
    const cells = mask.map(present => present ? String(read(7)) : '');
    if (read(4) !== 0) throw new Error('Invalid padding');
    return `|CardNo.${id};${cells.join(';')}`;
  });
  return loadGameFile(`${payload[1]}.bingoCards`, records.join(''));
}
