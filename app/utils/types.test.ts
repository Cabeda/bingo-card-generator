import {
  CardsPerPage,
  createCardId,
  createGameId,
  ExportFormat,
  GenerationState,
  getQualityValue,
  isValidCardsPerPage,
  QualityMode,
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

    it('should have correct QualityMode values', () => {
      expect(QualityMode.FAST).toBe('fast');
      expect(QualityMode.BALANCED).toBe('balanced');
      expect(QualityMode.HIGH).toBe('high');
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
    it('should map QualityMode.FAST to 0.5', () => {
      expect(getQualityValue(QualityMode.FAST)).toBe(0.5);
    });

    it('should map QualityMode.BALANCED to 0.7', () => {
      expect(getQualityValue(QualityMode.BALANCED)).toBe(0.7);
    });

    it('should map QualityMode.HIGH to 0.95', () => {
      expect(getQualityValue(QualityMode.HIGH)).toBe(0.95);
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
