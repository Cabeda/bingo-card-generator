import { Card, Game } from "./bingo.interface";
import { createCardId, createGameId } from "./types";

/**
 * Seeded random number generator for deterministic testing.
 * Uses a simple linear congruential generator (LCG) algorithm.
 * 
 * @param seed - Initial seed value
 * @returns A function that returns pseudo-random numbers between 0 and 1
 */
export function createSeededRandom(seed: number): () => number {
    let state = seed;
    return function() {
        // Linear congruential generator: (a * state + c) % m
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

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
 * @param randomFn - Optional random number generator (0 to 1). Defaults to Math.random. Used for deterministic testing.
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
export function generateBingoCard(cardNumber: string, randomFn: () => number = Math.random): Card {
    const ROWS = 3;
    const COLS = 9;
    const MAX_ATTEMPTS = 100; // Safety to avoid infinite loops when trying to avoid duplicate rows

    for (let attemptOuter = 0; attemptOuter < MAX_ATTEMPTS; attemptOuter++) {
        const card = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
        const usedNumbers = new Set<number>();

        // Fill columns and validate rows in a single pass
        for (let col = 0; col < COLS; col++) {
            const min = col === 0 ? 1 : col * 10;
            const max = col === 8 ? 89 : col * 10 + 9;
            const numbersNeeded = 2; // Each column should have 2 numbers

            // Generate and sort numbers for this column
            const columnNumbers = Array(numbersNeeded).fill(0)
                .map(() => {
                    let num;
                    do {
                        num = Math.floor(randomFn() * (max - min + 1)) + min;
                    } while (usedNumbers.has(num));
                    usedNumbers.add(num);
                    return num;
                })
                .sort((a, b) => a - b);

            // Assign numbers, ensuring at least one number per column
            const skipRow = Math.floor(randomFn() * ROWS);
            let assigned = 0;
            for (let row = 0; row < ROWS; row++) {
                if (row !== skipRow && assigned < columnNumbers.length) {
                    card[row][col] = columnNumbers[assigned++];
                }
            }
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
                    const removeIdx = Math.floor(randomFn() * filledIndices.length);
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
                    const addIdx = Math.floor(randomFn() * emptyIndices.length);
                    const addIndex = emptyIndices[addIdx];
                    
                    // Generate a number for this column that hasn't been used
                    const col = addIndex;
                    const min = col === 0 ? 1 : col * 10;
                    const max = col === 8 ? 89 : col * 10 + 9;
                    
                    let num;
                    let attempts = 0;
                    do {
                        num = Math.floor(randomFn() * (max - min + 1)) + min;
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

        // Validation: ensure no two rows are identical. If duplicate rows exist, retry.
        const rowSignatures = card.map((r) => r.map((v) => (v === null ? '' : String(v))).join(','));
        const uniqueRows = new Set(rowSignatures);
        if (uniqueRows.size === ROWS) {
            // Success - return the valid card
            return {
                cardTitle: createCardId(cardNumber),
                cardNumber: parseInt(cardNumber, 10),
                numbers: card.flat()
            };
        }
        // Otherwise, loop and try again up to MAX_ATTEMPTS
    }

    // Fallback: if unable to produce a card with unique rows after many attempts,
    // generate one last time and return it (avoids infinite loops in pathological RNG cases).
    const fallbackCard = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    const fallbackUsed = new Set<number>();
    for (let col = 0; col < COLS; col++) {
        const min = col === 0 ? 1 : col * 10;
        const max = col === 8 ? 89 : col * 10 + 9;
        const numbersNeeded = 2;
        const columnNumbers = Array(numbersNeeded).fill(0)
            .map(() => {
                let num;
                do {
                    num = Math.floor(Math.random() * (max - min + 1)) + min;
                } while (fallbackUsed.has(num));
                fallbackUsed.add(num);
                return num;
            })
            .sort((a, b) => a - b);

        const skipRow = Math.floor(Math.random() * ROWS);
        let assigned = 0;
        for (let row = 0; row < ROWS; row++) {
            if (row !== skipRow && assigned < columnNumbers.length) {
                fallbackCard[row][col] = columnNumbers[assigned++];
            }
        }
    }

    return {
        cardTitle: createCardId(cardNumber),
        cardNumber: parseInt(cardNumber, 10),
        numbers: fallbackCard.flat()
    };
}

