import { generateBingoCard } from './utils';
import { Card } from './bingo.interface';

describe('generateBingoCard', () => {
    it('should generate a bingo card with the correct structure', () => {
        const cardNumber = '12345';
        const card: Card = generateBingoCard(cardNumber);

        expect(card.cardNumber).toBe(cardNumber);
        expect(card.numbers).toHaveLength(27); // 3 rows * 9 columns
    });

    it('should have exactly 5 numbers in each row', () => {
        const cardNumber = '12345';
        const card: Card = generateBingoCard(cardNumber);

        for (let row = 0; row < 3; row++) {
            const rowNumbers = card.numbers.slice(row * 9, (row + 1) * 9);
            const filledCells = rowNumbers.filter(cell => cell !== null).length;
            expect(filledCells).toBe(5);
        }
    });

    it('should have unique numbers in each column', () => {
        const cardNumber = '12345';
        const card: Card = generateBingoCard(cardNumber);

        for (let col = 0; col < 9; col++) {
            const columnNumbers = [
                card.numbers[col],
                card.numbers[9 + col],
                card.numbers[18 + col]
            ].filter(cell => cell !== null);

            const uniqueNumbers = new Set(columnNumbers);
            expect(uniqueNumbers.size).toBe(columnNumbers.length);
        }
    });

    it('should have numbers within the correct range for each column', () => {
        const cardNumber = '12345';
        const card: Card = generateBingoCard(cardNumber);

        for (let col = 0; col < 9; col++) {
            const min = col === 0 ? 1 : col * 10;
            const max = col === 0 ? 9 : (col === 8 ? 90 : col * 10 + 9);

            const columnNumbers = [
                card.numbers[col],
                card.numbers[9 + col],
                card.numbers[18 + col]
            ].filter(cell => cell !== null);

            columnNumbers.forEach(num => {
                expect(num).toBeGreaterThanOrEqual(min);
                expect(num).toBeLessThanOrEqual(max);
            });
        }
    });
});