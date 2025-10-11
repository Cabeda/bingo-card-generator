import { Card, Game } from "./bingo.interface";

export function generateBingoCard(cardNumber: string): Card {
    const card = Array(3).fill(null).map(() => Array(9).fill(null));
    const usedNumbers = new Set<number>();

    // Fill columns and validate rows in a single pass
    for (let col = 0; col < 9; col++) {
        const min = col === 0 ? 1 : col * 10;
        const max = col === 8 ? 89 : col * 10 + 9;
        const numbersNeeded = col === 0 || col === 8 ? 3 : 2;
        
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
    card.forEach((row, rowIndex) => {
        const filledCount = row.filter(cell => cell !== null).length;
        if (filledCount > 5) {
            const filledIndices = row
                .map((cell, i) => cell !== null && i !== 0 && i !== 8 ? i : -1)
                .filter(i => i !== -1);
            
            while (row.filter(cell => cell !== null).length > 5) {
                const removeIndex = filledIndices[Math.floor(Math.random() * filledIndices.length)];
                row[removeIndex] = null;
                filledIndices.splice(filledIndices.indexOf(removeIndex), 1);
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