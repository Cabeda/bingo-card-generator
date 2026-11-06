import { buildPdf } from './vectorPdf';
import { PRESET_THEMES } from '../../utils/themes';
import { Game } from '../../utils/bingo.interface';

const theme = PRESET_THEMES.classic;

function makeGame(n: number): Game {
  const cards = Array.from({ length: n }, (_, i) => ({
    cardTitle: String(i + 1) as Game['cards'][0]['cardTitle'],
    cardNumber: i + 1,
    numbers: Array.from({ length: 27 }, (_, k) => (k % 2 === 0 ? k + 1 : null)),
  }));
  return { filename: 'test' as Game['filename'], cards };
}

describe('buildPdf', () => {
  it('produces a valid PDF with correct page count', async () => {
    const game = makeGame(5);
    const blob = buildPdf({
      cards: game.cards,
      header: 'Event',
      footer: 'Location',
      cardsPerPage: 2,
      theme,
    });
    expect(blob.type).toBe('application/pdf');
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    // 5 cards / 2 per page = 3 pages
    const countMatch = text.match(/\/Count\s+(\d+)/);
    expect(countMatch).not.toBeNull();
    expect(Number(countMatch![1])).toBe(3);
  });

  it('includes header and footer text', async () => {
    const game = makeGame(1);
    const blob = buildPdf({
      cards: game.cards,
      header: 'MyHeader',
      footer: 'MyFooter',
      cardsPerPage: 1,
      theme,
    });
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    expect(text).toContain('MyHeader');
    expect(text).toContain('MyFooter');
  });

  it('generates 1000 cards in under 1 second', () => {
    const game = makeGame(1000);
    const start = performance.now();
    const blob = buildPdf({
      cards: game.cards,
      header: 'Event',
      footer: 'Location',
      cardsPerPage: 4,
      theme,
    });
    const elapsed = performance.now() - start;
    expect(blob.size).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(2000);
  });

  it('supports cancellation', () => {
    const game = makeGame(100);
    let cancelled = false;
    expect(() =>
      buildPdf({
        cards: game.cards,
        header: 'Event',
        footer: 'Location',
        cardsPerPage: 1,
        theme,
        isCancelled: () => {
          cancelled = true;
          return true;
        },
      }),
    ).toThrow('__cancelled__');
    expect(cancelled).toBe(true);
  });
});
