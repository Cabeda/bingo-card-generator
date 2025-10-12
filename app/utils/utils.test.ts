import { generateBingoCard, parseBingoCards, generateRandomBingoCards } from './utils';
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
            const max = col === 0 ? 9 : (col === 8 ? 89 : col * 10 + 9);

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

    it('should have randomized column filling (first and last columns not always full)', () => {
        // Generate multiple cards and verify that columns 0 and 8 are not always filled
        const col0Counts: number[] = [];
        const col8Counts: number[] = [];
        
        for (let i = 1; i <= 30; i++) {
            const card = generateBingoCard(i.toString());
            
            // Count filled cells in column 0
            const col0Count = [
                card.numbers[0],
                card.numbers[9],
                card.numbers[18]
            ].filter(cell => cell !== null).length;
            col0Counts.push(col0Count);
            
            // Count filled cells in column 8
            const col8Count = [
                card.numbers[8],
                card.numbers[17],
                card.numbers[26]
            ].filter(cell => cell !== null).length;
            col8Counts.push(col8Count);
        }
        
        // Check that not all cards have fully filled columns 0 and 8
        const col0AllFull = col0Counts.every(count => count === 3);
        const col8AllFull = col8Counts.every(count => count === 3);
        
        expect(col0AllFull).toBe(false);
        expect(col8AllFull).toBe(false);
        
        // Also verify there's some variation in the counts
        const col0HasVariation = new Set(col0Counts).size > 1;
        const col8HasVariation = new Set(col8Counts).size > 1;
        
        expect(col0HasVariation).toBe(true);
        expect(col8HasVariation).toBe(true);
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

    describe('generateRandomBingoCards', () => {
        it('should generate the correct number of cards', () => {
            const numberOfCards = 5;
            const cards = generateRandomBingoCards(numberOfCards);

            expect(cards).toHaveLength(numberOfCards);
        });

        it('should generate cards with unique numbers (no duplicates)', () => {
            const numberOfCards = 10;
            const cards = generateRandomBingoCards(numberOfCards);

            // Convert each card's numbers to a string to check for duplicates
            const cardSignatures = cards.map(card => card.numbers.toString());
            const uniqueSignatures = new Set(cardSignatures);

            expect(uniqueSignatures.size).toBe(cards.length);
        });

        it('should generate zero cards when numberOfCards is 0', () => {
            const cards = generateRandomBingoCards(0);

            expect(cards).toHaveLength(0);
        });

        it('should generate exactly one card when numberOfCards is 1', () => {
            const cards = generateRandomBingoCards(1);

            expect(cards).toHaveLength(1);
            expect(cards[0].cardTitle).toBe('1');
            expect(cards[0].cardNumber).toBe(1);
        });

        it('should generate cards with proper card numbers', () => {
            const numberOfCards = 3;
            const cards = generateRandomBingoCards(numberOfCards);

            for (let i = 0; i < numberOfCards; i++) {
                expect(cards[i].cardTitle).toBe(`${i + 1}`);
                expect(cards[i].cardNumber).toBe(i + 1);
            }
        });

        it('should generate valid bingo cards that follow all rules', () => {
            const numberOfCards = 5;
            const cards = generateRandomBingoCards(numberOfCards);

            cards.forEach(card => {
                // Each card should have 27 cells (3 rows * 9 columns)
                expect(card.numbers).toHaveLength(27);

                // Each row should have exactly 5 numbers
                for (let row = 0; row < 3; row++) {
                    const rowNumbers = card.numbers.slice(row * 9, (row + 1) * 9);
                    const filledCells = rowNumbers.filter(cell => cell !== null).length;
                    expect(filledCells).toBe(5);
                }

                // Each column should have at least one number
                for (let col = 0; col < 9; col++) {
                    const columnNumbers = [
                        card.numbers[col],
                        card.numbers[9 + col],
                        card.numbers[18 + col]
                    ].filter(cell => cell !== null);

                    expect(columnNumbers.length).toBeGreaterThan(0);
                }

                // All non-null numbers should be unique on the card
                const nonNullNumbers = card.numbers.filter(num => num !== null);
                const uniqueNumbers = new Set(nonNullNumbers);
                expect(uniqueNumbers.size).toBe(nonNullNumbers.length);
            });
        });

        it('should handle generating a large number of cards', () => {
            const numberOfCards = 50;
            const cards = generateRandomBingoCards(numberOfCards);

            expect(cards).toHaveLength(numberOfCards);

            // Verify all cards are unique
            const cardSignatures = cards.map(card => card.numbers.toString());
            const uniqueSignatures = new Set(cardSignatures);
            expect(uniqueSignatures.size).toBe(numberOfCards);
        });
    });
});