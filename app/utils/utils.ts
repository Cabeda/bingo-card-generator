import { Card, Game } from "./bingo.interface";

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

    // Ensure exactly 5 numbers per row
    card.forEach((row) => {
        const filledCount = row.filter(cell => cell !== null).length;
        
        if (filledCount > 5) {
            // Remove excess numbers, but avoid creating empty columns
            const filledIndices = row
                .map((cell, i) => {
                    if (cell === null) return -1;
                    // Check if this is the only number in the column
                    const columnCount = [card[0][i], card[1][i], card[2][i]].filter(c => c !== null).length;
                    // Don't remove if it would create an empty column
                    if (columnCount === 1) return -1;
                    return i;
                })
                .filter(i => i !== -1);
            
            while (row.filter(cell => cell !== null).length > 5) {
                if (filledIndices.length === 0) break; // Safety check
                const removeIndex = filledIndices[Math.floor(Math.random() * filledIndices.length)];
                row[removeIndex] = null;
                filledIndices.splice(filledIndices.indexOf(removeIndex), 1);
            }
        } else if (filledCount < 5) {
            // Add numbers to reach exactly 5
            const emptyIndices = row
                .map((cell, i) => cell === null ? i : -1)
                .filter(i => i !== -1);
            
            while (row.filter(cell => cell !== null).length < 5 && emptyIndices.length > 0) {
                const addIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
                
                // Generate a number for this column that hasn't been used
                const col = addIndex;
                const min = col === 0 ? 1 : col * 10;
                const max = col === 8 ? 90 : col * 10 + 9;
                
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
                    const columnValues = [card[0][col], card[1][col], card[2][col]]
                        .filter(v => v !== null)
                        .sort((a, b) => a - b);
                    
                    let valueIndex = 0;
                    for (let r = 0; r < 3; r++) {
                        if (card[r][col] !== null) {
                            card[r][col] = columnValues[valueIndex++];
                        }
                    }
                }
                
                emptyIndices.splice(emptyIndices.indexOf(addIndex), 1);
            }
        }
    });

    return {
        cardTitle: cardNumber,
        cardNumber: parseInt(cardNumber, 10),
        numbers: card.flat()
    };
}

export function parseBingoCards(filename: string, content: string): Game {
    const cards: Card[] = content
        .split('|')
        .filter(Boolean)
        .map((cardStr) => {
            const [cardNoStr, ...numberStrs] = cardStr.split(';');
            const cardNumber = parseInt(cardNoStr.replace('CardNo.', ''), 10);
            const cardTitle = `${filename}-${cardNumber}`;
            const numbers = numberStrs.map((num) =>
                num ? parseInt(num, 10) : null
            );
            return {cardTitle: cardTitle, cardNumber: cardNumber, numbers };
        });
    return { filename, cards };
}