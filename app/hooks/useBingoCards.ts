import { useState } from "react";
import { Game } from "../utils/bingo.interface";
import { generateRandomBingoCards, parseBingoCards } from "../utils/utils";
import { createGameId } from "../utils/types";

/**
 * Custom hook for managing bingo card state and operations.
 * 
 * This hook encapsulates all logic related to:
 * - Storing and managing the current set of bingo cards
 * - Generating random bingo cards
 * - Parsing bingo cards from uploaded files
 * - Exporting bingo cards to .bingoCards format
 * 
 * @returns Object containing:
 *   - bingoCards: Current game with cards or null
 *   - isGenerating: Loading state during card generation
 *   - generateCards: Function to generate random cards
 *   - parseCardsFromFile: Function to parse cards from file content
 *   - exportBingoGame: Function to export cards to .bingoCards format
 */
export function useBingoCards() {
  const [bingoCards, setBingoCards] = useState<Game | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  /**
   * Generates a specified number of random bingo cards.
   * 
   * @param numCards - Number of cards to generate
   * @param eventHeader - Event name for the game ID
   * @returns The generated game object
   */
  const generateCards = (numCards: number, eventHeader: string): Game => {
    setIsGenerating(true);
    
    const generatedCards = generateRandomBingoCards(numCards);
    const game: Game = {
      filename: createGameId(`${getCurrentDate()}-${eventHeader}`),
      cards: generatedCards,
    };
    
    setBingoCards(game);
    setIsGenerating(false);
    
    return game;
  };

  /**
   * Parses bingo cards from file content.
   * 
   * @param filename - Name of the file (without extension)
   * @param content - Content of the .bingoCards file
   * @returns The parsed game object
   */
  const parseCardsFromFile = (filename: string, content: string): Game => {
    const bingoGame = parseBingoCards(filename, content);
    setBingoCards(bingoGame);
    return bingoGame;
  };

  /**
   * Exports the current bingo game to a .bingoCards file.
   * 
   * @param eventHeader - Event name for the filename
   */
  const exportBingoGame = (eventHeader: string): void => {
    if (!bingoCards) return;

    const content = bingoCards.cards
      .map((card) => {
        const cardNo = `CardNo.${card.cardTitle.split("-").pop()}`;
        const numberStrs = card.numbers.join(";");
        return `|${cardNo};${numberStrs}`;
      })
      .join("");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const filename = `${eventHeader}-${getCurrentDate()}.bingoCards`;

    const element = document.createElement("a");
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  /**
   * Generates a formatted date-time string for file naming.
   * 
   * @returns Formatted date-time string (e.g., "20241225-1430")
   */
  const getCurrentDate = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}${month}${day}-${hours}${minutes}`;
  };

  return {
    bingoCards,
    isGenerating,
    generateCards,
    parseCardsFromFile,
    exportBingoGame,
  };
}
