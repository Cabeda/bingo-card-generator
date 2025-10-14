import { Card, Game } from './bingo.interface';
import { exportCardsAsCsv, exportCardsAsJson } from './exportUtils';
import { createGameId, createCardId } from './types';

// Mock data for testing
const mockCard1: Card = {
  cardTitle: createCardId('001'),
  cardNumber: 1,
  numbers: [
    1, null, 20, null, 40, null, 60, null, 80,
    2, 15, null, 35, null, 55, null, 75, null,
    null, 18, 25, null, 45, null, 65, null, 85,
  ],
};

const mockCard2: Card = {
  cardTitle: createCardId('002'),
  cardNumber: 2,
  numbers: [
    3, null, 22, null, 42, null, 62, null, 82,
    null, 16, 26, null, 46, null, 66, null, 86,
    5, 19, null, 38, null, 58, null, 78, null,
  ],
};

const mockGame: Game = {
  filename: createGameId('test-game'),
  cards: [mockCard1, mockCard2],
};

describe('exportUtils', () => {
  describe('exportCardsAsCsv', () => {
    it('should export cards to CSV format', () => {
      const csv = exportCardsAsCsv(mockGame);
      const lines = csv.split('\n');

      // Check header
      expect(lines[0]).toBe('CardNumber,CardTitle,Row1,Row2,Row3');

      // Check card data
      expect(lines.length).toBe(3); // header + 2 cards
      expect(lines[1]).toContain('1');
      expect(lines[1]).toContain('001');
      expect(lines[2]).toContain('2');
      expect(lines[2]).toContain('002');
    });

    it('should handle empty cells correctly', () => {
      const csv = exportCardsAsCsv(mockGame);
      const lines = csv.split('\n');

      // CSV should contain empty values for null cells
      expect(lines[1]).toContain('||'); // Adjacent empty cells
    });

    it('should export all rows for each card', () => {
      const csv = exportCardsAsCsv(mockGame);
      const lines = csv.split('\n');

      // Each card line should have 3 row data sections
      const card1Data = lines[1];
      const rowMatches = card1Data.match(/"[^"]*"/g);
      expect(rowMatches).toHaveLength(4); // CardTitle + Row1 + Row2 + Row3
    });
  });

  describe('exportCardsAsJson', () => {
    it('should export cards to JSON format', () => {
      const json = exportCardsAsJson(mockGame);
      const data = JSON.parse(json);

      expect(data.filename).toBe('test-game');
      expect(data.cardCount).toBe(2);
      expect(data.cards).toHaveLength(2);
    });

    it('should include export metadata', () => {
      const json = exportCardsAsJson(mockGame);
      const data = JSON.parse(json);

      expect(data.exportDate).toBeDefined();
      expect(new Date(data.exportDate)).toBeInstanceOf(Date);
    });

    it('should preserve card structure', () => {
      const json = exportCardsAsJson(mockGame);
      const data = JSON.parse(json);

      const card1 = data.cards[0];
      expect(card1.cardNumber).toBe(1);
      expect(card1.cardTitle).toBe('001');
      expect(card1.numbers).toHaveLength(27);
      expect(card1.numbers[0]).toBe(1);
      expect(card1.numbers[1]).toBeNull();
    });

    it('should support pretty printing', () => {
      const prettyJson = exportCardsAsJson(mockGame, true);
      const compactJson = exportCardsAsJson(mockGame, false);

      // Pretty JSON should have more characters (whitespace)
      expect(prettyJson.length).toBeGreaterThan(compactJson.length);
      expect(prettyJson).toContain('\n');
      expect(compactJson).not.toContain('\n');
    });
  });
});
