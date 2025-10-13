import { Card, Game } from "./bingo.interface";
import { createCardId, createGameId } from "./types";

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
 * Generates a hash for a card's numbers array for fast duplicate detection.
 * This is much faster than toString() for large datasets.
 */
function hashCardNumbers(numbers: (number | null)[]): string {
    // Use a simple but fast hash: join with a delimiter (comma) that won't appear in numbers.  
    // This is safe because all numbers are integers (no commas in their string representation),  
    // and null values become empty strings when joined, so there is no ambiguity.
    return numbers.join(',');
}

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