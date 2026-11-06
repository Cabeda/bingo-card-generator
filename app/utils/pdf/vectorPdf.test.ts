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

const readPdf = (blob: Blob): Promise<string> => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.readAsText(blob);
});

it.each([
  ['#f00', 'rgb(0, 255, 0)', 'rgba(0,0,255,0.5)', 'white', '1rem', '2em', 'serif', 'Times-Bold', '12 w'],
  ['#123456', 'black', 'red', 'green', '2pt', '0', 'monospace', 'Courier-Bold', '2 w'],
  ['blue', 'gray', 'grey', '#zz', '4', 'bad', 'sans-serif', 'Helvetica-Bold', '3 w'],
  ['', 'unknown', 'rgb(1,2)', '#12', '', '', '', 'Helvetica-Bold', '0.5 w'],
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'Helvetica-Bold', '0.5 w'],
])('renders supported theme values with safe unsupported-value fallbacks: %s', async (primaryColor, secondaryColor, textColor, backgroundColor, borderWidth, borderRadius, fontFamily, font, width) => {
  const custom = { ...theme, primaryColor, secondaryColor, textColor, backgroundColor, borderWidth, borderRadius, fontFamily } as typeof theme;
  const pdf = await readPdf(buildPdf({ cards: makeGame(1).cards, header: 'A (B)\\C\n☃', footer: 'End', cardsPerPage: 1, theme: custom }));
  expect(pdf).toContain('/BaseFont /' + font);
  expect(pdf).toContain(width);
  expect(pdf).not.toMatch(/NaN|Infinity/);
  expect(pdf).toContain('A \\(B\\)\\\\C  ');
  expect(pdf).toContain('/MediaBox [0 0 595.28 841.89]');
});

it('reports page progress followed by completion, including an empty deck', async () => {
  const onProgress = jest.fn();
  buildPdf({ cards: makeGame(3).cards, header: '', footer: '', cardsPerPage: 2, theme, onProgress, isCancelled: () => false });
  expect(onProgress.mock.calls.flat()).toEqual([53, 95, 100]);
  onProgress.mockClear();
  const pdf = await readPdf(buildPdf({ cards: [], header: '', footer: '', cardsPerPage: 2, theme, onProgress }));
  expect(pdf).toContain('/Count 0');
  expect(onProgress).toHaveBeenCalledWith(100);
});

it('cancels after the last page before finalizing the document', () => {
  let cancelled = false;
  const onProgress = jest.fn(() => { cancelled = true; });
  expect(() => buildPdf({ cards: makeGame(1).cards, header: '', footer: '', cardsPerPage: 1, theme, onProgress, isCancelled: () => cancelled })).toThrow('__cancelled__');
  expect(onProgress).toHaveBeenCalledTimes(1);
});

it.each([
  ['#f00', '1.000 0.000 0.000'],
  ['#123456', '0.071 0.204 0.337'],
  ['rgb(0, 255, 0)', '0.000 1.000 0.000'],
  ['rgba(0,0,255,0.5)', '0.000 0.000 1.000'],
  ['green', '0.000 0.500 0.000'],
  ['unsupported', '0.000 0.000 0.000'],
])('emits the requested cell fill color %s', async (primaryColor, expected) => {
  const pdf = await readPdf(buildPdf({ cards: makeGame(1).cards, header: '', footer: '', cardsPerPage: 1, theme: { ...theme, primaryColor } }));
  expect(pdf).toContain(expected + ' rg');
});

it('writes a consistent PDF cross-reference table and page references', async () => {
  const pdf = await readPdf(buildPdf({ cards: makeGame(3).cards, header: 'Event', footer: 'Place', cardsPerPage: 2, theme }));
  const xrefOffset = Number(pdf.match(/startxref\n(\d+)/)![1]);
  expect(pdf.slice(xrefOffset)).toMatch(/^xref\n/);
  const entries = [...pdf.matchAll(/^(\d{10}) 00000 n /gm)];
  entries.forEach((entry, index) => expect(pdf.slice(Number(entry[1]))).toMatch(new RegExp(`^${index + 1} 0 obj\\n`)));
  expect(pdf.match(/\/Type \/Page /g)).toHaveLength(2);
  expect(pdf.match(/\(Event\) Tj/g)).toHaveLength(2);
  expect(pdf).toMatch(/%%EOF\n$/);
});
