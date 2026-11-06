import { Card } from './bingo.interface';
import { createCardId } from './types';

/** Link protocol v1: preserve this algorithm and byte order for existing links. */
export async function generateSharedCardsV1(seed: Uint8Array<ArrayBuffer>, count: number): Promise<Card[]> {
  const key = await crypto.subtle.importKey('raw', seed, 'AES-CTR', false, ['encrypt']);
  const stream = new DataView(await crypto.subtle.encrypt(
    { name: 'AES-CTR', counter: new Uint8Array(16), length: 64 }, key, new Uint8Array(1024 * 1024),
  ));
  let offset = 0;
  const integer = (limit: number): number => {
    const ceiling = 2 ** 32 - (2 ** 32 % limit);
    let value: number;
    do {
      if (offset === stream.byteLength) throw new Error('Generation limit reached');
      value = stream.getUint32(offset, false);
      offset += 4;
    } while (value >= ceiling);
    return value % limit;
  };
  const cards: Card[] = [];
  const seen = new Set<string>();
  while (cards.length < count) {
    const rows = Array.from({ length: 3 }, () => {
      const columns = Array.from({ length: 9 }, (_, i) => i);
      for (let i = 0; i < 5; i++) {
        const selected = i + integer(9 - i);
        [columns[i], columns[selected]] = [columns[selected], columns[i]];
      }
      return new Set(columns.slice(0, 5));
    });
    if (Array.from({ length: 9 }, (_, col) => rows.every(row => !row.has(col))).some(Boolean)) continue;
    const numbers: (number | null)[] = Array(27).fill(null);
    for (let col = 0; col < 9; col++) {
      const positions = rows.flatMap((row, index) => row.has(col) ? [index * 9 + col] : []);
      const min = col === 0 ? 1 : col * 10;
      const max = col === 8 ? 90 : col * 10 + 9;
      const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      for (let i = 0; i < positions.length; i++) {
        const selected = i + integer(values.length - i);
        [values[i], values[selected]] = [values[selected], values[i]];
      }
      values.slice(0, positions.length).sort((a, b) => a - b).forEach((n, i) => { numbers[positions[i]] = n; });
    }
    const signature = numbers.join(',');
    if (seen.has(signature)) continue;
    seen.add(signature);
    const cardNumber = cards.length + 1;
    cards.push({ cardTitle: createCardId(String(cardNumber)), cardNumber, numbers });
  }
  return cards;
}
