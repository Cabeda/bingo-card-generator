import { generateBingoCard, generateRandomBingoCards, parseBingoCards } from './utils';
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

    it('should have numbers sorted in ascending order within each column', () => {
        const cardNumber = '12345';
        const card: Card = generateBingoCard(cardNumber);

        for (let col = 0; col < 9; col++) {
            const columnNumbers = [
                card.numbers[col],
                card.numbers[9 + col],
                card.numbers[18 + col]
            ].filter(cell => cell !== null) as number[];

            // Check if sorted in ascending order
            for (let i = 1; i < columnNumbers.length; i++) {
                expect(columnNumbers[i]).toBeGreaterThan(columnNumbers[i - 1]);
            }
        }
    });

    it('should have all unique numbers across the entire card', () => {
        const cardNumber = '12345';
        const card: Card = generateBingoCard(cardNumber);

        const allNumbers = card.numbers.filter(num => num !== null) as number[];
        const uniqueNumbers = new Set(allNumbers);

        expect(uniqueNumbers.size).toBe(allNumbers.length);
    });

    it('should have exactly 15 numbers total on the card', () => {
        const cardNumber = '12345';
        const card: Card = generateBingoCard(cardNumber);

        const totalNumbers = card.numbers.filter(num => num !== null).length;
        expect(totalNumbers).toBe(15); // 3 rows * 5 numbers per row
    });

    it('should have exactly 12 empty cells on the card', () => {
        const cardNumber = '12345';
        const card: Card = generateBingoCard(cardNumber);

        const totalEmpty = card.numbers.filter(num => num === null).length;
        expect(totalEmpty).toBe(12); // 27 total - 15 numbers
    });

    it('should validate column 0 range (1-9)', () => {
        // Generate multiple cards to test range
        for (let i = 0; i < 20; i++) {
            const card = generateBingoCard(i.toString());
            const col0Numbers = [
                card.numbers[0],
                card.numbers[9],
                card.numbers[18]
            ].filter(num => num !== null) as number[];

            col0Numbers.forEach(num => {
                expect(num).toBeGreaterThanOrEqual(1);
                expect(num).toBeLessThanOrEqual(9);
            });
        }
    });

    it('should validate column 8 range (80-89)', () => {
        // Generate multiple cards to test range
        for (let i = 0; i < 20; i++) {
            const card = generateBingoCard(i.toString());
            const col8Numbers = [
                card.numbers[8],
                card.numbers[17],
                card.numbers[26]
            ].filter(num => num !== null) as number[];

            col8Numbers.forEach(num => {
                expect(num).toBeGreaterThanOrEqual(80);
                expect(num).toBeLessThanOrEqual(89);
            });
        }
    });

    it('should validate middle columns ranges (10-79)', () => {
        const card = generateBingoCard('test');
        
        for (let col = 1; col <= 7; col++) {
            const columnNumbers = [
                card.numbers[col],
                card.numbers[9 + col],
                card.numbers[18 + col]
            ].filter(num => num !== null) as number[];

            const expectedMin = col * 10;
            const expectedMax = col * 10 + 9;

            columnNumbers.forEach(num => {
                expect(num).toBeGreaterThanOrEqual(expectedMin);
                expect(num).toBeLessThanOrEqual(expectedMax);
            });
        }
    });

    it('should maintain consistent structure across multiple generations', () => {
        for (let i = 0; i < 10; i++) {
            const card = generateBingoCard(i.toString());
            
            // Verify all bingo rules
            expect(card.numbers).toHaveLength(27);
            
            // Check rows
            for (let row = 0; row < 3; row++) {
                const rowNumbers = card.numbers.slice(row * 9, (row + 1) * 9);
                const filledCount = rowNumbers.filter(n => n !== null).length;
                expect(filledCount).toBe(5);
            }
            
            // Check columns
            for (let col = 0; col < 9; col++) {
                const colNumbers = [
                    card.numbers[col],
                    card.numbers[9 + col],
                    card.numbers[18 + col]
                ].filter(n => n !== null);
                expect(colNumbers.length).toBeGreaterThan(0);
            }
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

        it('should handle cards with null values (empty cells)', () => {
            const filename = 'testfile';
            const content = 'CardNo.1;1;;3;;5;6;;8;9';
            const game: Game = parseBingoCards(filename, content);

            expect(game.cards).toHaveLength(1);
            expect(game.cards[0].numbers).toEqual([1, null, 3, null, 5, 6, null, 8, 9]);
        });

        it('should handle multiple cards with proper card number parsing', () => {
            const filename = 'game123';
            const content = 'CardNo.5;1;2;3;4;5|CardNo.10;6;7;8;9;10|CardNo.100;11;12;13;14;15';
            const game: Game = parseBingoCards(filename, content);

            expect(game.cards).toHaveLength(3);
            expect(game.cards[0].cardNumber).toBe(5);
            expect(game.cards[0].cardTitle).toBe('game123-5');
            expect(game.cards[1].cardNumber).toBe(10);
            expect(game.cards[1].cardTitle).toBe('game123-10');
            expect(game.cards[2].cardNumber).toBe(100);
            expect(game.cards[2].cardTitle).toBe('game123-100');
        });

        it('should handle content with leading/trailing pipes', () => {
            const filename = 'testfile';
            const content = '|CardNo.1;1;2;3|CardNo.2;4;5;6|';
            const game: Game = parseBingoCards(filename, content);

            expect(game.cards).toHaveLength(2);
            expect(game.cards[0].cardNumber).toBe(1);
            expect(game.cards[1].cardNumber).toBe(2);
        });

        it('should parse a full 27-cell bingo card correctly', () => {
            const filename = 'fullcard';
            // Simulate a full bingo card with nulls
            const content = 'CardNo.1;1;;3;;5;6;;8;9;10;;12;;14;15;;17;18;19;;21;;23;24;;26;27';
            const game: Game = parseBingoCards(filename, content);

            expect(game.cards).toHaveLength(1);
            expect(game.cards[0].numbers).toHaveLength(27);
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

        it('should generate cards with sequential card numbers', () => {
            const numberOfCards = 20;
            const cards = generateRandomBingoCards(numberOfCards);

            cards.forEach((card, index) => {
                expect(card.cardNumber).toBe(index + 1);
                expect(card.cardTitle).toBe(`${index + 1}`);
            });
        });

        it('should generate different cards on each invocation', () => {
            const batch1 = generateRandomBingoCards(3);
            const batch2 = generateRandomBingoCards(3);

            // While theoretically possible to get duplicates, it's extremely unlikely
            // Check that at least one card is different between batches
            const batch1Sigs = batch1.map(c => c.numbers.toString());
            const batch2Sigs = batch2.map(c => c.numbers.toString());
            
            const hasAnyDifference = batch1Sigs.some((sig, i) => sig !== batch2Sigs[i]);
            expect(hasAnyDifference).toBe(true);
        });

        it('should ensure all generated cards follow bingo rules', () => {
            const numberOfCards = 30;
            const cards = generateRandomBingoCards(numberOfCards);

            cards.forEach(card => {
                // Total cells
                expect(card.numbers).toHaveLength(27);

                // Exactly 5 numbers per row
                for (let row = 0; row < 3; row++) {
                    const rowNumbers = card.numbers.slice(row * 9, (row + 1) * 9);
                    const filledCount = rowNumbers.filter(n => n !== null).length;
                    expect(filledCount).toBe(5);
                }

                // At least one number per column
                for (let col = 0; col < 9; col++) {
                    const colNumbers = [
                        card.numbers[col],
                        card.numbers[9 + col],
                        card.numbers[18 + col]
                    ].filter(n => n !== null);
                    expect(colNumbers.length).toBeGreaterThan(0);
                }

                // All numbers are unique
                const allNumbers = card.numbers.filter(n => n !== null) as number[];
                const uniqueNumbers = new Set(allNumbers);
                expect(uniqueNumbers.size).toBe(allNumbers.length);

                // Numbers are in correct ranges and sorted per column
                for (let col = 0; col < 9; col++) {
                    const min = col === 0 ? 1 : col * 10;
                    const max = col === 0 ? 9 : (col === 8 ? 89 : col * 10 + 9);
                    const colNumbers = [
                        card.numbers[col],
                        card.numbers[9 + col],
                        card.numbers[18 + col]
                    ].filter(n => n !== null) as number[];

                    // Check range
                    colNumbers.forEach(num => {
                        expect(num).toBeGreaterThanOrEqual(min);
                        expect(num).toBeLessThanOrEqual(max);
                    });

                    // Check ascending order
                    for (let i = 1; i < colNumbers.length; i++) {
                        expect(colNumbers[i]).toBeGreaterThan(colNumbers[i - 1]);
                    }
                }
            });
        });

        it('should handle stress test of 1000 cards', () => {
            const numberOfCards = 1000;
            const startTime = Date.now();
            const cards = generateRandomBingoCards(numberOfCards);
            const endTime = Date.now();

            expect(cards).toHaveLength(numberOfCards);
            
            // Should complete in reasonable time (less than 1 second)
            expect(endTime - startTime).toBeLessThan(1000);

            // Verify uniqueness
            const cardSignatures = cards.map(card => card.numbers.join(','));
            const uniqueSignatures = new Set(cardSignatures);
            expect(uniqueSignatures.size).toBe(numberOfCards);
        });

        it('should maintain proper cardNumber type (number, not string)', () => {
            const cards = generateRandomBingoCards(5);
            
            cards.forEach(card => {
                expect(typeof card.cardNumber).toBe('number');
                expect(Number.isInteger(card.cardNumber)).toBe(true);
                expect(typeof card.cardTitle).toBe('string');
            });
        });
    });
});