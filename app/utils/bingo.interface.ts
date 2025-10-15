import { CardId, GameId } from './types';

/**
 * Represents a single bingo card with its unique identifier and number grid.
 * 
 * A bingo card follows traditional bingo rules:
 * - 3 rows × 9 columns (27 cells total)
 * - Each row has exactly 5 numbers and 4 empty cells (null values)
 * - Each column has at least 1 number (no completely empty columns)
 * - Numbers are sorted in ascending order within each column
 * - All numbers are unique on the card
 * 
 * @property cardTitle - Human-readable identifier for the card (e.g., "001", "game-5")
 * @property cardNumber - Numeric identifier for the card (e.g., 1, 5, 100)
 * @property numbers - Array of 27 numbers representing the card grid (3 rows × 9 columns).
 *                     `null` represents an empty cell in the grid.
 * 
 * @example
 * ```typescript
 * const card: Card = {
 *   cardTitle: "001",
 *   cardNumber: 1,
 *   numbers: [1, 12, null, 33, null, 56, null, 78, 89, ...]
 * };
 * ```
 * 
 * @see {@link Game} for the container of multiple cards
 * @see {@link generateBingoCard} for creating new cards
 */
export interface Card {
  cardTitle: CardId;
  cardNumber: number;
  numbers: (number | null)[];
}

/**
 * Represents a bingo game containing multiple cards and metadata.
 * 
 * A game is typically created by parsing a `.bingoCards` file or by
 * generating random cards for a new event.
 * 
 * @property filename - Name identifier for the game (typically derived from the uploaded file)
 * @property cards - Array of bingo cards in this game
 * 
 * @example
 * ```typescript
 * const game: Game = {
 *   filename: "christmas-2024",
 *   cards: [card1, card2, card3]
 * };
 * ```
 * 
 * @see {@link Card} for individual card structure
 * @see {@link parseBingoCards} for parsing games from files
 * @see {@link generateRandomBingoCards} for creating new games
 */
export interface Game {
  filename: GameId;
  cards: Card[];
}

/**
 * Represents a theme configuration for bingo cards.
 * 
 * This interface defines the visual appearance of bingo cards including:
 * - Color scheme (primary, secondary, text, background)
 * - Typography (font family)
 * - Layout properties (border radius, width, padding)
 * 
 * @property name - Display name of the theme
 * @property primaryColor - Main color used for cell backgrounds
 * @property secondaryColor - Border color and secondary UI elements
 * @property textColor - Color for numbers and text on cards
 * @property backgroundColor - Background color for empty cells
 * @property fontFamily - Font family for card text
 * @property borderRadius - Corner rounding of cells (e.g., "0.25rem", "8px")
 * @property borderWidth - Width of cell borders (e.g., "0.125rem", "2px")
 * @property cellPadding - Internal padding of cells (e.g., "0.5rem", "8px")
 * 
 * @example
 * ```typescript
 * const modernTheme: CardTheme = {
 *   name: "Modern",
 *   primaryColor: "#4F46E5",
 *   secondaryColor: "#E5E7EB",
 *   textColor: "#FFFFFF",
 *   backgroundColor: "#F9FAFB",
 *   fontFamily: "Inter, sans-serif",
 *   borderRadius: "0.5rem",
 *   borderWidth: "1px",
 *   cellPadding: "1rem"
 * };
 * ```
 */
export interface CardTheme {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
  fontFamily: string;
  borderRadius: string;
  borderWidth: string;
  cellPadding: string;
}