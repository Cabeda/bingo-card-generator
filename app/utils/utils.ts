type BingoCard = (number | null)[][];

import { Card, Game } from "./bingo.interface";

export function generateBingoCard(cardNumber: string): Card {
    const card: BingoCard = Array(3).fill(null).map(() => Array(9).fill(null));
    const usedNumbers: Set<number> = new Set();

    // Helper function to get a random number within a range
    const getRandomNumber = (min: number, max: number): number => {
        let num;
        do {
            num = Math.floor(Math.random() * (max - min + 1)) + min;
        } while (usedNumbers.has(num));
        usedNumbers.add(num);
        return num;
    };

    // Fill each column
    for (let col = 0; col < 9; col++) {
        const min = col === 0 ? 1 : col * 10;
        const max = col === 0 ? 9 : (col === 8 ? 90 : col * 10 + 9);
        const columnNumbers: number[] = [];

        // Generate 3 unique numbers for each column
        for (let i = 0; i < 3; i++) {
            columnNumbers.push(getRandomNumber(min, max));
        }

        // Sort the numbers
        columnNumbers.sort((a, b) => a - b);

        // Randomly choose which row to leave blank (if needed)
        const blankRow = col === 0 || col === 8 ? -1 : Math.floor(Math.random() * 3);

        // Assign numbers to the card
        for (let row = 0; row < 3; row++) {
            if (col === 0 || col === 8 || row !== blankRow) {
                card[row][col] = columnNumbers[row];
            }
        }
    }

    // Ensure each row has exactly 5 numbers
    for (let row = 0; row < 3; row++) {
        const filledCells = card[row].filter(cell => cell !== null).length;
        if (filledCells > 5) {
            // Remove random numbers until we have 5
            while (card[row].filter(cell => cell !== null).length > 5) {
                const filledIndices = card[row].map((cell, index) => cell !== null ? index : -1).filter(index => index !== -1);
                const indexToRemove = filledIndices[Math.floor(Math.random() * filledIndices.length)];
                card[row][indexToRemove] = null;
            }
        }
    }

    const finalCard: Card = {
        cardNumber,
        numbers: card.flat(),
    }
    return finalCard;
}

export function parseBingoCards(filename: string, content: string): Game {
    const cards: Card[] = content
        .split('|')
        .filter(Boolean)
        .map((cardStr) => {
            const [cardNoStr, ...numberStrs] = cardStr.split(';');
            const cardNumber = `${filename}-${cardNoStr.replace('CardNo.', '')}`;
            const numbers = numberStrs.map((num) =>
                num ? parseInt(num, 10) : null
            );
            return { cardNumber, numbers };
        });
    return { filename, cards };
}