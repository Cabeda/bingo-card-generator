import * as htmlToImage from "html-to-image";
import JSZip from "jszip";
import { Card, Game } from "./bingo.interface";
import { QualityMode } from "./types";

/**
 * Export utilities for different bingo card formats.
 * 
 * This module provides functions for exporting bingo cards to various formats:
 * - PNG (individual cards)
 * - PNG Grid (all cards in one image)
 * - CSV (data format)
 * - JSON (structured data)
 */

/**
 * Convert a card DOM element to PNG blob.
 * 
 * @param cardElement - DOM element to convert
 * @param quality - Quality mode for image generation
 * @returns Promise resolving to PNG blob
 */
export async function cardToPngBlob(
  cardElement: HTMLDivElement,
  quality: QualityMode
): Promise<Blob> {
  const qualitySettings = {
    fast: { quality: 0.5, pixelRatio: 1 },
    balanced: { quality: 0.7, pixelRatio: 1.5 },
    high: { quality: 0.95, pixelRatio: 2 },
  };

  const settings = qualitySettings[quality];
  const dataUrl = await htmlToImage.toPng(cardElement, {
    quality: settings.quality,
    pixelRatio: settings.pixelRatio,
    skipFonts: true,
    cacheBust: false,
  });

  // Convert data URL to blob
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Export cards to individual PNG files.
 * 
 * @param cardElements - Array of card DOM elements
 * @param cards - Array of card data
 * @param quality - Quality mode for image generation
 * @param onProgress - Progress callback
 * @returns Array of { blob, filename } objects
 */
export async function exportCardsAsPng(
  cardElements: (HTMLDivElement | null)[],
  cards: Card[],
  quality: QualityMode,
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ blob: Blob; filename: string }>> {
  const results: Array<{ blob: Blob; filename: string }> = [];

  for (let i = 0; i < cardElements.length; i++) {
    const element = cardElements[i];
    if (element) {
      const blob = await cardToPngBlob(element, quality);
      results.push({
        blob,
        filename: `bingo-card-${cards[i].cardTitle}.png`,
      });
      if (onProgress) {
        onProgress(i + 1, cardElements.length);
      }
    }
  }

  return results;
}

/**
 * Export cards to a single PNG grid image.
 * 
 * @param cardElements - Array of card DOM elements
 * @param quality - Quality mode for image generation
 * @param cardsPerRow - Number of cards per row in grid
 * @returns PNG blob of grid layout
 */
export async function exportCardsAsPngGrid(
  cardElements: (HTMLDivElement | null)[],
  quality: QualityMode,
  cardsPerRow: number = 3
): Promise<Blob> {
  // Create a container for the grid
  const container = document.createElement('div');
  container.style.display = 'grid';
  container.style.gridTemplateColumns = `repeat(${cardsPerRow}, 1fr)`;
  container.style.gap = '20px';
  container.style.padding = '20px';
  container.style.backgroundColor = 'white';

  // Clone and append all card elements
  cardElements.forEach((element) => {
    if (element) {
      const clone = element.cloneNode(true) as HTMLElement;
      container.appendChild(clone);
    }
  });

  // Temporarily add to DOM
  document.body.appendChild(container);

  try {
    const qualitySettings = {
      fast: { quality: 0.5, pixelRatio: 1 },
      balanced: { quality: 0.7, pixelRatio: 1.5 },
      high: { quality: 0.95, pixelRatio: 2 },
    };

    const settings = qualitySettings[quality];
    const dataUrl = await htmlToImage.toPng(container, {
      quality: settings.quality,
      pixelRatio: settings.pixelRatio,
      skipFonts: true,
      cacheBust: false,
    });

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    return response.blob();
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
}

/**
 * Export cards to CSV format.
 * 
 * @param game - Game object containing cards
 * @returns CSV string
 */
export function exportCardsAsCsv(game: Game): string {
  const lines: string[] = [];
  
  // Header
  lines.push('CardNumber,CardTitle,Row1,Row2,Row3');

  // Each card as a row
  game.cards.forEach((card) => {
    const rows: string[][] = [[], [], []];
    
    // Split numbers into 3 rows
    for (let i = 0; i < card.numbers.length; i++) {
      const rowIndex = Math.floor(i / 9);
      const value = card.numbers[i];
      rows[rowIndex].push(value === null ? '' : String(value));
    }

    // Convert rows to comma-separated strings
    const row1 = rows[0].join('|');
    const row2 = rows[1].join('|');
    const row3 = rows[2].join('|');

    lines.push(`${card.cardNumber},"${card.cardTitle}","${row1}","${row2}","${row3}"`);
  });

  return lines.join('\n');
}

/**
 * Export cards to JSON format.
 * 
 * @param game - Game object containing cards
 * @param pretty - Whether to pretty-print JSON
 * @returns JSON string
 */
export function exportCardsAsJson(game: Game, pretty: boolean = true): string {
  const data = {
    filename: game.filename,
    exportDate: new Date().toISOString(),
    cardCount: game.cards.length,
    cards: game.cards.map((card) => ({
      cardNumber: card.cardNumber,
      cardTitle: card.cardTitle,
      numbers: card.numbers,
    })),
  };

  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

/**
 * Download a blob as a file.
 * 
 * @param blob - Blob to download
 * @param filename - Filename for download
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const element = document.createElement('a');
  element.href = url;
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(url);
}

/**
 * Create a ZIP file containing multiple files.
 * 
 * @param files - Array of { blob, filename } objects
 * @returns ZIP file as blob
 */
export async function createZipArchive(
  files: Array<{ blob: Blob; filename: string }>
): Promise<Blob> {
  const zip = new JSZip();

  files.forEach(({ blob, filename }) => {
    zip.file(filename, blob);
  });

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

