import {
  GenerationState,
  ExportFormat,
  QualityLevel,
  CardsPerPage,
  createCardId,
  createGameId,
  isValidCardsPerPage,
  getQualityValue,
} from './types';

describe('Type System', () => {
  describe('Enums', () => {
    it('should have correct GenerationState values', () => {
      expect(GenerationState.IDLE).toBe('idle');
      expect(GenerationState.GENERATING).toBe('generating');
      expect(GenerationState.COMPLETE).toBe('complete');
      expect(GenerationState.ERROR).toBe('error');
    });

    it('should have correct ExportFormat values', () => {
      expect(ExportFormat.PDF).toBe('pdf');
      expect(ExportFormat.BINGO_CARDS).toBe('bingoCards');
      expect(ExportFormat.PNG).toBe('png');
    });

    it('should have correct QualityLevel values', () => {
      expect(QualityLevel.LOW).toBe('low');
      expect(QualityLevel.MEDIUM).toBe('medium');
      expect(QualityLevel.HIGH).toBe('high');
    });
  });

  describe('Branded Types', () => {
    it('should create CardId from string', () => {
      const cardId = createCardId('card-123');
      expect(typeof cardId).toBe('string');
      expect(cardId).toBe('card-123');
    });

    it('should create GameId from string', () => {
      const gameId = createGameId('game-456');
      expect(typeof gameId).toBe('string');
      expect(gameId).toBe('game-456');
    });
  });

  describe('Type Guards', () => {
    it('should validate CardsPerPage values', () => {
      expect(isValidCardsPerPage(1)).toBe(true);
      expect(isValidCardsPerPage(2)).toBe(true);
      expect(isValidCardsPerPage(3)).toBe(true);
      expect(isValidCardsPerPage(0)).toBe(false);
      expect(isValidCardsPerPage(4)).toBe(false);
      expect(isValidCardsPerPage(-1)).toBe(false);
      expect(isValidCardsPerPage(1.5)).toBe(false);
    });
  });

  describe('Quality Value Mapping', () => {
    it('should map QualityLevel.LOW to 0.5', () => {
      expect(getQualityValue(QualityLevel.LOW)).toBe(0.5);
    });

    it('should map QualityLevel.MEDIUM to 0.7', () => {
      expect(getQualityValue(QualityLevel.MEDIUM)).toBe(0.7);
    });

    it('should map QualityLevel.HIGH to 1.0', () => {
      expect(getQualityValue(QualityLevel.HIGH)).toBe(1.0);
    });
  });

  describe('CardsPerPage Type', () => {
    it('should accept valid literal values', () => {
      const validValues: CardsPerPage[] = [1, 2, 3];
      validValues.forEach((value) => {
        expect([1, 2, 3]).toContain(value);
      });
    });
  });
});
