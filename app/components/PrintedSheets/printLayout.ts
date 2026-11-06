/**
 * Print layouts for A4 sheets.
 *
 * The preview and the printed sheet share these measurements: every card is
 * full width and has a fixed height, so cards stop growing once they are
 * comfortable to read instead of stretching to fill the page. Each sheet owns
 * a whole page, so a card is never split across two pages.
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
  { cardsPerPage: 2, columns: 1, rows: 2, cardHeightMm: 105 },
  { cardsPerPage: 3, columns: 1, rows: 3, cardHeightMm: 80 },
  { cardsPerPage: 4, columns: 1, rows: 4, cardHeightMm: 60 },
];

export const CARDS_PER_PAGE_OPTIONS = PRINT_LAYOUTS.map(
  (layout) => layout.cardsPerPage,
);

export const DEFAULT_CARDS_PER_PAGE = 4;

/** Physical paper measurements shared by preview scaling and printed pages. */
export const PRINT_PAGE = { widthMm: 210, heightMm: 297, marginMm: 12, gapMm: 4 } as const;

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
    )!
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
