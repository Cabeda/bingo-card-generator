import {
  CARDS_PER_PAGE_OPTIONS,
  DEFAULT_CARDS_PER_PAGE,
  layoutFor,
  normalizeCardsPerPage,
  PRINT_LAYOUTS,
  sheetCount,
  sheetsOf,
} from "./printLayout";

const A4_WIDTH_MM = 186; // 210 mm minus 2 x 12 mm margins
const A4_HEIGHT_MM = 273; // 297 mm minus 2 x 12 mm margins
const GAP_MM = 4;

describe("print layouts", () => {
  it("offers the documented card counts", () => {
    expect(CARDS_PER_PAGE_OPTIONS).toEqual([1, 2, 3, 4, 6, 8]);
    expect(DEFAULT_CARDS_PER_PAGE).toBe(4);
  });

  it.each(PRINT_LAYOUTS.map((layout) => [layout]))(
    "keeps $cardsPerPage cards inside the printable A4 area",
    (layout) => {
      const height =
        layout.rows * layout.cardHeightMm + (layout.rows - 1) * GAP_MM;
      expect(height).toBeLessThanOrEqual(A4_HEIGHT_MM);
      const cardWidth =
        (A4_WIDTH_MM - (layout.columns - 1) * GAP_MM) / layout.columns;
      expect(cardWidth).toBeGreaterThan(40);
      expect(layout.columns * layout.rows).toBe(layout.cardsPerPage);
    },
  );

  it("falls back to four cards for unknown or malformed values", () => {
    for (const value of [undefined, null, "8", 0, 5, 7, -4, 3.5, NaN])
      expect(normalizeCardsPerPage(value)).toBe(4);
    expect(layoutFor(9).cardsPerPage).toBe(4);
    expect(layoutFor(6)).toMatchObject({ columns: 2, rows: 3 });
  });

  it("counts sheets for complete and partial decks", () => {
    expect(sheetCount(0, 4)).toBe(0);
    expect(sheetCount(1, 4)).toBe(1);
    expect(sheetCount(4, 4)).toBe(1);
    expect(sheetCount(5, 4)).toBe(2);
    expect(sheetCount(9, 8)).toBe(2);
    expect(sheetCount(10, 3)).toBe(4);
    expect(sheetCount(-1, 4)).toBe(0);
  });

  it("splits cards into pages without losing or reordering them", () => {
    const cards = Array.from({ length: 9 }, (_, index) => index + 1);
    const sheets = sheetsOf(cards, 4);
    expect(sheets).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9],
    ]);
    expect(sheets.flat()).toEqual(cards);
    expect(sheetsOf(cards, 8)).toHaveLength(2);
    expect(sheetsOf([], 4)).toEqual([]);
  });
});
