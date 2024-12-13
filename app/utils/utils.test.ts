import { generateBingoCard, parseBingoCards } from './utils';
import { Card, Game } from './bingo.interface';

describe('generateBingoCard', () => {
    it('should generate a bingo card with the correct structure', () => {
        const cardNumber = '12345';
        const card: Card = generateBingoCard(cardNumber);

        expect(card.cardTitle).toBe(cardNumber);
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

    it('should have no empty columns', () => {
        const cardNumber = '12345';
        const card: Card = generateBingoCard(cardNumber);

        for (let col = 0; col < 9; col++) {
            const columnNumbers = [
                card.numbers[col],
                card.numbers[9 + col], 
                card.numbers[18 + col]
            ].filter(cell => cell !== null);

            expect(columnNumbers.length).toBeGreaterThan(0);
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

    describe('generateBingoCard', () => {
        it('should generate a bingo card with the correct structure', () => {
            const cardNumber = '12345';
            const card: Card = generateBingoCard(cardNumber);

            expect(card.cardTitle).toBe(cardNumber);
            expect(card.cardNumber).toBe(Number.parseInt(cardNumber));
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
    });

    describe('parseBingoCards', () => {
        it('should parse bingo cards correctly from content', () => {
            const filename = 'testfile';
            const content = 'CardNo.1;1;2;3;4;5;6;7;8;9|CardNo.2;10;11;12;13;14;15;16;17;18';
            const game: Game = parseBingoCards(filename, content);

            expect(game.filename).toBe(filename);
            expect(game.cards).toHaveLength(2);

            const card1 = game.cards[0];
            expect(card1.cardTitle).toBe('testfile-1');
            expect(card1.cardNumber).toBe(1);
            expect(card1.numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);

            const card2 = game.cards[1];
            expect(card2.cardTitle).toBe('testfile-2');
            expect(card2.cardNumber).toBe(2);
            expect(card2.numbers).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
        });

        it('should handle empty content gracefully', () => {
            const filename = 'testfile';
            const content = '';
            const game: Game = parseBingoCards(filename, content);

            expect(game.filename).toBe(filename);
            expect(game.cards).toHaveLength(0);
        });
    });
});