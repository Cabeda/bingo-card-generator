import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { createSharedGame, decodeGameLink, encodeGameLink } from './shareGame';

Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
Object.assign(globalThis, { TextEncoder, TextDecoder });

it('recreates identical cards from a short link without sharing progress', async () => {
  const game = await createSharedGame('Family night', 100);
  const link = await encodeGameLink(game);
  expect(link.length).toBeLessThan(150);
  const restored = await decodeGameLink(link);
  expect(restored).toEqual(game);
  expect(new Set(game.cards.map(card => card.numbers.join(','))).size).toBe(100);
  for (const card of game.cards) {
    expect(card.numbers.filter(n => n !== null)).toHaveLength(15);
    for (const start of [0, 9, 18]) expect(card.numbers.slice(start, start + 9).filter(n => n !== null)).toHaveLength(5);
  }
});

it('preserves imported card numbers, blank cells and repeated legacy values exactly', async () => {
  const { loadGameFile } = await import('./gameFiles');
  const game = loadGameFile('Férias.bingoCards', '|CardNo.700;1;;21;31;;51;;71;;2;12;;;42;;62;;82;;13;23;33;;53;;73;');
  expect(await decodeGameLink(await encodeGameLink(game))).toEqual(game);
});

it('rejects malformed, oversized, unsupported and corrupted links', async () => {
  const link = await encodeGameLink(await createSharedGame('Evening', 1));
  for (const invalid of ['', '#bingo=***', '#bingo=' + 'a'.repeat(9000), link.slice(0, -1) + (link.endsWith('A') ? 'B' : 'A')]) {
    await expect(decodeGameLink(invalid)).rejects.toThrow();
  }
});

it('keeps protocol v1 compatible with a fixed published example', async () => {
  const link = '#bingo=WzEsIlJlZmVyZW5jZSIsMSwiQUFBQUFBQUFBQUFBQUFBQUFBQUFBQSJd.5nR_HaXr8i4idAuBfm13TA';
  const game = await decodeGameLink(link);
  expect(game.cards[0].numbers).toEqual([2,10,22,null,42,null,null,74,null,4,null,null,36,null,null,60,77,85,null,11,28,null,null,56,65,null,90]);
  expect(await encodeGameLink(game)).toBe(link);
});

it('falls back to exact cards when a generated deck was edited', async () => {
  const game = await createSharedGame('Edited', 1);
  game.cards[0].cardNumber = 9;
  const restored = await decodeGameLink(await encodeGameLink(game));
  expect(restored.cards[0].cardNumber).toBe(9);
  expect(restored.cards[0].numbers).toEqual(game.cards[0].numbers);
});

it('rejects huge imported decks with a file-sharing fallback', async () => {
  const game = await createSharedGame('Large', 1000);
  delete game.generation;
  await expect(encodeGameLink(game)).rejects.toThrow('too large');
});

it.each([['', 1], ['x'.repeat(321), 1], ['Name', 0], ['Name', 1001], ['Name', 1.5], ['Name', -1]])('rejects invalid game parameters %s %s', async (name, count) => {
  await expect(createSharedGame(name as string, count as number)).rejects.toThrow();
});

it.each(['!', 'AA', 'AAAAAAAAAAAAAAAAAAAAAB'])('rejects invalid seed %s', async seed => {
  await expect(createSharedGame('Name', 1, seed)).rejects.toThrow();
});

async function sealed(payload: unknown): Promise<string> {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))).slice(0, 16);
  return '#bingo=' + data + '.' + Buffer.from(digest).toString('base64url');
}

it.each([null, [], [3, 'Name', 1, 'AA'], [1, 'Name', 1, 7], [2, 'Name', 1, 'AA'], [2, 'Name', [0], 'AA'], [2, 'Name', [1], 'AA'], [1, false, 1, 'AAAAAAAAAAAAAAAAAAAAAA']])('rejects invalid versioned payload %#', async payload => {
  await expect(decodeGameLink(await sealed(payload))).rejects.toThrow();
});

it('rejects invalid occupancy, card IDs, numbers and padding in packed cards', async () => {
  const game = await createSharedGame('Packed', 1);
  delete game.generation;
  const link = await encodeGameLink(game);
  const payload = JSON.parse(Buffer.from(link.slice(7).split('.')[0], 'base64url').toString());
  for (const id of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '1']) {
    await expect(decodeGameLink(await sealed([2, 'Packed', [id], payload[3]]))).rejects.toThrow();
  }
  for (const kind of ['mask', 'number', 'padding']) {
    const bytes = Buffer.from(payload[3], 'base64url');
    if (kind === 'mask') bytes.fill(0);
    if (kind === 'number') { bytes[3] |= 31; bytes[4] |= 192; }
    if (kind === 'padding') bytes[16] |= 1;
    await expect(decodeGameLink(await sealed([2, 'Packed', [1], bytes.toString('base64url')]))).rejects.toThrow();
  }
});

it('rejects duplicate cards and biased integer samples supplied by the random source', async () => {
  const card = [0,0,0,0,0, 4,4,4,4,4, 0,0,0,4,4, ...Array(15).fill(0)];
  const different = [...card];
  different[15] = 2;
  const values = [0xffffffff, ...card, ...card, ...different];
  const stream = new ArrayBuffer(values.length * 4);
  values.forEach((n, i) => new DataView(stream).setUint32(i * 4, n));
  const source = jest.spyOn(crypto.subtle, 'encrypt').mockResolvedValue(stream);
  try {
    const game = await createSharedGame('Duplicates', 2, 'AAAAAAAAAAAAAAAAAAAAAA');
    expect(game.cards).toHaveLength(2);
    expect(game.cards[0].numbers).not.toEqual(game.cards[1].numbers);
  } finally { source.mockRestore(); }
});

it('fails explicitly if its random source cannot supply a valid deck', async () => {
  const source = jest.spyOn(crypto.subtle, 'encrypt').mockResolvedValue(new ArrayBuffer(4));
  try { await expect(createSharedGame('Exhausted', 1)).rejects.toThrow('Generation limit'); }
  finally { source.mockRestore(); }
});
