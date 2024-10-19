type BingoCard = (number | null)[][];

import { Card } from "./bingo.interface";

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
        const min = col * 10 + 1;
        const max = col === 8 ? 90 : min + 9;
        const columnNumbers: number[] = [];

        // Generate 3 unique numbers for each column
        for (let i = 0; i < 3; i++) {
            columnNumbers.push(getRandomNumber(min, max));
        }

        // Sort the numbers
        columnNumbers.sort((a, b) => a - b);

        // Randomly choose which row to leave blank (if needed)
        const blankRow = Math.floor(Math.random() * 3);

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

// Generate and print a bingo card
const bingoCard = generateBingoCard("1");
console.log(bingoCard);
