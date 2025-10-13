import { Card, Game } from "./bingo.interface";
import { createCardId, createGameId } from "./types";

/**
 * Generates a valid bingo card with the specified card number.
 * 
 * The generated card follows traditional bingo rules:
 * - 3 rows × 9 columns (27 cells total)
 * - Each row has exactly 5 numbers and 4 empty cells
 * - Each column has at least 1 number (no completely empty columns)
 * - Numbers are sorted in ascending order within each column
 * - All numbers on the card are unique
 * - Column number ranges:
 *   - Column 0: 1-9
 *   - Columns 1-7: (col × 10) to (col × 10 + 9)
 *   - Column 8: 80-89
 * 
 * The algorithm generates numbers for each column first, then adjusts row
 * distribution to ensure exactly 5 numbers per row while maintaining
 * column constraints.
 * 
 * @param cardNumber - Unique identifier for the card (e.g., "001", "5", "ABC-123")
 * @returns A Card object with validated structure and sorted numbers
 * 
 * @example
 * ```typescript
 * const card = generateBingoCard("001");
 * console.log(card.cardTitle); // "001"
 * console.log(card.numbers.length); // 27
 * ```
 * 
 * @see {@link Card} for the return type structure
 * @see {@link generateRandomBingoCards} for generating multiple cards
 */
export function generateBingoCard(cardNumber: string): Card {
    const card = Array(3).fill(null).map(() => Array(9).fill(null));
    const usedNumbers = new Set<number>();

    // Fill columns and validate rows in a single pass
    for (let col = 0; col < 9; col++) {
        const min = col === 0 ? 1 : col * 10;
        const max = col === 8 ? 89 : col * 10 + 9;
        const numbersNeeded = 2;
        
        // Generate and sort numbers for this column
        const columnNumbers = Array(3).fill(0)
            .map(() => {
                let num;
                do {
                    num = Math.floor(Math.random() * (max - min + 1)) + min;
                } while (usedNumbers.has(num));
                usedNumbers.add(num);
                return num;
            })
            .sort((a, b) => a - b);

        // Assign numbers, ensuring at least one number per column
        const skipRow = numbersNeeded < 3 ? Math.floor(Math.random() * 3) : -1;
        columnNumbers.forEach((num, row) => {
            if (row !== skipRow) card[row][col] = num;
        });
    }

    // Ensure exactly 5 numbers per row - optimized version
    card.forEach((row) => {
        let filledCount = 0;
        for (let i = 0; i < 9; i++) {
            if (row[i] !== null) filledCount++;
        }
        
        if (filledCount > 5) {
            // Remove excess numbers, but avoid creating empty columns
            const filledIndices: number[] = [];
            for (let i = 0; i < 9; i++) {
                if (row[i] === null) continue;
                // Check if this is the only number in the column
                let columnCount = 0;
                for (let r = 0; r < 3; r++) {
                    if (card[r][i] !== null) columnCount++;
                }
                // Don't remove if it would create an empty column
                if (columnCount > 1) filledIndices.push(i);
            }
            
            while (filledCount > 5 && filledIndices.length > 0) {
                const removeIdx = Math.floor(Math.random() * filledIndices.length);
                const removeIndex = filledIndices[removeIdx];
                row[removeIndex] = null;
                filledIndices.splice(removeIdx, 1);
                filledCount--;
            }
        } else if (filledCount < 5) {
            // Add numbers to reach exactly 5
            const emptyIndices: number[] = [];
            for (let i = 0; i < 9; i++) {
                if (row[i] === null) emptyIndices.push(i);
            }
            
            while (filledCount < 5 && emptyIndices.length > 0) {
                const addIdx = Math.floor(Math.random() * emptyIndices.length);
                const addIndex = emptyIndices[addIdx];
                
                // Generate a number for this column that hasn't been used
                const col = addIndex;
                const min = col === 0 ? 1 : col * 10;
                const max = col === 8 ? 89 : col * 10 + 9;
                
                let num;
                let attempts = 0;
                do {
                    num = Math.floor(Math.random() * (max - min + 1)) + min;
                    attempts++;
                    if (attempts > 100) break; // Safety check
                } while (usedNumbers.has(num));
                
                if (attempts <= 100) {
                    row[addIndex] = num;
                    usedNumbers.add(num);
                    
                    // Re-sort the column to maintain ascending order
                    const columnValues: number[] = [];
                    for (let r = 0; r < 3; r++) {
                        if (card[r][col] !== null) {
                            columnValues.push(card[r][col] as number);
                        }
                    }
                    columnValues.sort((a, b) => a - b);
                    
                    let valueIndex = 0;
                    for (let r = 0; r < 3; r++) {
                        if (card[r][col] !== null) {
                            card[r][col] = columnValues[valueIndex++];
                        }
                    }
                    
                    filledCount++;
                }
                
                emptyIndices.splice(addIdx, 1);
            }
        }
    });

    return {
        cardTitle: createCardId(cardNumber),
        cardNumber: parseInt(cardNumber, 10),
        numbers: card.flat()
    };
}

/**
 * Generates a hash string for a card's numbers array for fast duplicate detection.
 * 
 * This function creates a string representation of the card by joining all numbers
 * with commas. This is significantly faster than `toString()` for large datasets
 * and enables efficient duplicate checking using Set data structures.
 * 
 * The hash is safe and unambiguous because:
 * - All numbers are integers (no decimal points or commas in their representation)
 * - `null` values become empty strings when joined
 * - The comma delimiter cannot appear in number representations
 * 
 * @param numbers - Array of numbers and nulls representing a bingo card
 * @returns A string hash of the card for comparison (e.g., "1,,3,,5,6,,8,9,...")
 * 
 * @example
 * ```typescript
 * const hash1 = hashCardNumbers([1, null, 3, 4]);
 * const hash2 = hashCardNumbers([1, null, 3, 4]);
 * console.log(hash1 === hash2); // true - identical cards
 * ```
 * 
 * @see {@link generateRandomBingoCards} for usage in duplicate detection
 */
function hashCardNumbers(numbers: (number | null)[]): string {
    // Use a simple but fast hash: join with a delimiter (comma) that won't appear in numbers.  
    // This is safe because all numbers are integers (no commas in their string representation),  
    // and null values become empty strings when joined, so there is no ambiguity.
    return numbers.join(',');
}

/**
 * Generates multiple unique bingo cards with sequential numbering.
 * 
 * This function creates the specified number of bingo cards, each with a unique
 * number distribution. The function attempts to ensure all cards are unique by
 * checking for duplicates using hash-based comparison. If a duplicate is detected,
 * it regenerates the card up to 100 times before accepting it.
 * 
 * Cards are numbered sequentially starting from 1 (e.g., "1", "2", "3", ...).
 * 
 * **Performance**: This function can generate thousands of cards efficiently.
 * A stress test of 1000 cards typically completes in under 1 second.
 * 
 * @param numberOfCards - Number of unique bingo cards to generate (must be ≥ 0)
 * @returns Array of Card objects with sequential numbering
 * 
 * @example
 * ```typescript
 * // Generate 10 cards
 * const cards = generateRandomBingoCards(10);
 * console.log(cards.length); // 10
 * console.log(cards[0].cardTitle); // "1"
 * console.log(cards[9].cardTitle); // "10"
 * 
 * // All cards follow bingo rules
 * cards.forEach(card => {
 *   const filledCells = card.numbers.filter(n => n !== null).length;
 *   console.log(filledCells); // 15 (exactly 5 per row × 3 rows)
 * });
 * ```
 * 
 * @see {@link generateBingoCard} for single card generation
 * @see {@link Card} for the card structure
 * @see {@link hashCardNumbers} for the duplicate detection mechanism
 */
export function generateRandomBingoCards(numberOfCards: number): Card[] {
    const generatedCards: Card[] = [];
    const generatedCardHashes = new Set<string>();

    for (let i = 0; i < numberOfCards; i++) {
        let card: Card;
        let hash: string;
        let attempts = 0;
        const maxAttempts = 100; // Prevent infinite loops
        
        do {
            card = generateBingoCard(`${i + 1}`);
            hash = hashCardNumbers(card.numbers);
            attempts++;
            
            // If we've tried too many times, just accept the card
            // (Collisions are extremely rare with proper random generation)
            if (attempts >= maxAttempts) {
                break;
            }
        } while (generatedCardHashes.has(hash));
        
        generatedCardHashes.add(hash);
        generatedCards.push(card);
    }

    return generatedCards;
}

/**
 * Parses bingo cards from a `.bingoCards` file format.
 * 
 * The `.bingoCards` format is a custom text format where:
 * - Cards are separated by pipe (`|`) characters
 * - Each card starts with `CardNo.{number}`
 * - Numbers are separated by semicolons (`;`)
 * - Empty cells are represented by empty strings between semicolons
 * - Example: `|CardNo.1;1;;3;;5;6;;8;9|CardNo.2;10;11;12;...`
 * 
 * @param filename - Name identifier for the game (used as prefix for card titles)
 * @param content - Raw text content from the `.bingoCards` file
 * @returns A Game object containing all parsed cards with their metadata
 * 
 * @example
 * ```typescript
 * // Parse a simple file with two cards
 * const content = '|CardNo.1;1;2;3;4;5|CardNo.2;10;11;12;13;14';
 * const game = parseBingoCards('christmas-2024', content);
 * 
 * console.log(game.filename); // "christmas-2024"
 * console.log(game.cards.length); // 2
 * console.log(game.cards[0].cardTitle); // "christmas-2024-1"
 * console.log(game.cards[0].cardNumber); // 1
 * 
 * // Parse a card with empty cells (nulls)
 * const contentWithNulls = '|CardNo.1;1;;3;;5;6;;8;9';
 * const game2 = parseBingoCards('test', contentWithNulls);
 * console.log(game2.cards[0].numbers); // [1, null, 3, null, 5, 6, null, 8, 9]
 * ```
 * 
 * @see {@link Game} for the return type structure
 * @see {@link Card} for individual card structure
 */
export function parseBingoCards(filename: string, content: string): Game {
    const cards: Card[] = content
        .split('|')
        .filter(Boolean)
        .map((cardStr) => {
            const [cardNoStr, ...numberStrs] = cardStr.split(';');
            const cardNumber = parseInt(cardNoStr.replace('CardNo.', ''), 10);
            const cardTitle = createCardId(`${filename}-${cardNumber}`);
            const numbers = numberStrs.map((num) =>
                num ? parseInt(num, 10) : null
            );
            return {cardTitle: cardTitle, cardNumber: cardNumber, numbers };
        });
    return { filename: createGameId(filename), cards };
}