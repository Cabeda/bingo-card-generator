/**
 * Print layouts for A4 sheets.
 *
 * A 90-ball card is nine columns wide, so the number of cards on a sheet
 * decides both the grid and the card height. Every layout below fits inside
 * the 186 x 273 mm printable area of A4 with 12 mm margins, and each sheet
 * owns a whole page, so a card is never split across two pages.
 */
export interface PrintLayout {
  cardsPerPage: number;
  columns: number;
  rows: number;
  /** Height of one card in millimetres. */
  cardHeightMm: number;
}

export const PRINT_LAYOUTS: readonly PrintLayout[] = [
  { cardsPerPage: 1, columns: 1, rows: 1, cardHeightMm: 120 },
  { cardsPerPage: 2, columns: 1, rows: 2, cardHeightMm: 120 },
  { cardsPerPage: 3, columns: 1, rows: 3, cardHeightMm: 88 },
  { cardsPerPage: 4, columns: 1, rows: 4, cardHeightMm: 65 },
  { cardsPerPage: 6, columns: 2, rows: 3, cardHeightMm: 88 },
  { cardsPerPage: 8, columns: 2, rows: 4, cardHeightMm: 65 },
];

export const CARDS_PER_PAGE_OPTIONS = PRINT_LAYOUTS.map(
  (layout) => layout.cardsPerPage,
);

export const DEFAULT_CARDS_PER_PAGE = 4;

export function normalizeCardsPerPage(value: unknown): number {
  return typeof value === "number" &&
    CARDS_PER_PAGE_OPTIONS.includes(value)
    ? value
    : DEFAULT_CARDS_PER_PAGE;
}

export function layoutFor(cardsPerPage: number): PrintLayout {
  return (
    PRINT_LAYOUTS.find(
      (layout) => layout.cardsPerPage === normalizeCardsPerPage(cardsPerPage),
    ) ?? PRINT_LAYOUTS[3]
  );
}

/** Number of A4 sheets needed for the whole deck. */
export function sheetCount(totalCards: number, cardsPerPage: number): number {
  if (!Number.isFinite(totalCards) || totalCards <= 0) return 0;
  return Math.ceil(totalCards / normalizeCardsPerPage(cardsPerPage));
}

/** Split cards into one array per printed sheet, keeping card order. */
export function sheetsOf<T>(cards: readonly T[], cardsPerPage: number): T[][] {
  const perPage = normalizeCardsPerPage(cardsPerPage);
  const sheets: T[][] = [];
  for (let i = 0; i < cards.length; i += perPage) {
    sheets.push(cards.slice(i, i + perPage));
  }
  return sheets;
}
