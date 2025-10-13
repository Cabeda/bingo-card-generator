/**
 * Type definitions for improved type safety across the application
 */

/**
 * Generation states for card generation process
 */
export enum GenerationState {
  IDLE = 'idle',
  GENERATING = 'generating',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * Export format options for bingo cards
 */
export enum ExportFormat {
  PDF = 'pdf',
  BINGO_CARDS = 'bingoCards',
  PNG = 'png'
}

/**
 * Quality modes for PDF/image generation
 */
export enum QualityMode {
  FAST = 'fast',
  BALANCED = 'balanced',
  HIGH = 'high'
}

/**
 * Literal union type for cards per page (1-3 cards allowed)
 */
export type CardsPerPage = 1 | 2 | 3;

/**
 * Branded type for Card IDs to prevent string confusion
 */
export type CardId = string & { __brand: 'CardId' };

/**
 * Branded type for Game IDs to prevent string confusion
 */
export type GameId = string & { __brand: 'GameId' };

/**
 * PDF generation configuration options
 */
export interface PdfGenerationOptions {
  quality: QualityMode;
  cardsPerPage: CardsPerPage;
  pixelRatio: number;
  format: ExportFormat;
  skipFonts?: boolean;
  cacheBust?: boolean;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Validation result for bingo cards and game data
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}

/**
 * Helper function to create a branded CardId
 */
export function createCardId(id: string): CardId {
  return id as CardId;
}

/**
 * Helper function to create a branded GameId
 */
export function createGameId(id: string): GameId {
  return id as GameId;
}

/**
 * Type guard to check if a value is a valid CardsPerPage
 */
export function isValidCardsPerPage(value: number): value is CardsPerPage {
  return value === 1 || value === 2 || value === 3;
}

/**
 * Maps quality mode enum to numeric quality value (0-1)
 */
export function getQualityValue(mode: QualityMode): number {
  switch (mode) {
    case QualityMode.FAST:
      return 0.5;
    case QualityMode.BALANCED:
      return 0.7;
    case QualityMode.HIGH:
      return 0.95;
  }
}
