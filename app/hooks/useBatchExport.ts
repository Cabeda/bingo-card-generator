import { useCallback, useRef, useState } from "react";
import { Game } from "../utils/bingo.interface";
import { BatchExportOptions, ExportFormat, ExportProgress, QualityMode } from "../utils/types";
import {
  createZipArchive,
  downloadBlob,
  exportCardsAsCsv,
  exportCardsAsJson,
  exportCardsAsPng,
  exportCardsAsPngGrid,
} from "../utils/exportUtils";
import { getCurrentDate } from "../utils/utils";

/**
 * Custom hook for managing batch exports of bingo cards.
 * 
 * This hook provides functionality for exporting bingo cards in multiple formats:
 * - Individual PNG files
 * - PNG grid (all cards in one image)
 * - CSV data format
 * - JSON structured data
 * - ZIP archive containing multiple formats
 * 
 * @returns Object containing:
 *   - isExporting: Loading state during export
 *   - exportProgress: Progress tracking for each format
 *   - exportBatch: Function to export multiple formats
 *   - cancelExport: Function to cancel ongoing export
 */
export function useBatchExport() {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress[]>([]);
  const cancelRef = useRef<boolean>(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  /**
   * Callback to set card ref by index.
   */
  const setCardRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      cardRefs.current[index] = el;
    },
    []
  );

  /**
   * Cancel the current export operation.
   */
  const cancelExport = (): void => {
    cancelRef.current = true;
  };

  /**
   * Update progress for a specific format.
   */
  const updateProgress = (
    format: ExportFormat,
    progress: number,
    status: ExportProgress['status'],
    error?: string
  ): void => {
    setExportProgress((prev) =>
      prev.map((item) =>
        item.format === format
          ? { ...item, progress, status, error }
          : item
      )
    );
  };

  /**
   * Export a single format.
   */
  const exportSingleFormat = async (
    format: ExportFormat,
    bingoCards: Game,
    eventHeader: string,
    quality: QualityMode,
    cardsPerPage: number
  ): Promise<{ blob: Blob; filename: string } | null> => {
    if (cancelRef.current) return null;

    updateProgress(format, 0, 'processing');

    try {
      let blob: Blob;
      let filename: string;
      const timestamp = getCurrentDate();

      switch (format) {
        case ExportFormat.PNG: {
          // Export individual PNG files
          const pngFiles = await exportCardsAsPng(
            cardRefs.current,
            bingoCards.cards,
            quality,
            (current, total) => {
              updateProgress(format, (current / total) * 100, 'processing');
            }
          );

          // Create ZIP of all PNG files
          blob = await createZipArchive(pngFiles);
          filename = `${timestamp}-${eventHeader}-cards.zip`;
          break;
        }

        case ExportFormat.PNG_GRID: {
          blob = await exportCardsAsPngGrid(cardRefs.current, quality, cardsPerPage);
          filename = `${timestamp}-${eventHeader}-grid.png`;
          updateProgress(format, 100, 'processing');
          break;
        }

        case ExportFormat.CSV: {
          const csvContent = exportCardsAsCsv(bingoCards);
          blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
          filename = `${timestamp}-${eventHeader}.csv`;
          updateProgress(format, 100, 'processing');
          break;
        }

        case ExportFormat.JSON: {
          const jsonContent = exportCardsAsJson(bingoCards, true);
          blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
          filename = `${timestamp}-${eventHeader}.json`;
          updateProgress(format, 100, 'processing');
          break;
        }

        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      updateProgress(format, 100, 'completed');
      return { blob, filename };
    } catch (error) {
      console.error(`Error exporting ${format}:`, error);
      updateProgress(format, 0, 'error', String(error));
      return null;
    }
  };

  /**
   * Export cards in multiple formats.
   * 
   * @param bingoCards - Game object containing cards to export
   * @param options - Batch export options
   * @param eventHeader - Event name for filenames
   * @param onComplete - Callback when all exports complete
   * @param onError - Callback for errors
   */
  const exportBatch = async (
    bingoCards: Game | null,
    options: BatchExportOptions,
    eventHeader: string,
    onComplete: () => void,
    onError: (message: string) => void
  ): Promise<void> => {
    if (!bingoCards) {
      onError('No cards to export');
      return;
    }

    setIsExporting(true);
    cancelRef.current = false;

    // Initialize progress tracking
    const initialProgress: ExportProgress[] = options.formats.map((format) => ({
      format,
      progress: 0,
      status: 'pending',
    }));
    setExportProgress(initialProgress);

    try {
      const exportedFiles: Array<{ blob: Blob; filename: string }> = [];

      // Export each format sequentially
      for (const format of options.formats) {
        if (cancelRef.current) {
          updateProgress(format, 0, 'cancelled');
          continue;
        }

        const result = await exportSingleFormat(
          format,
          bingoCards,
          eventHeader,
          options.quality,
          options.cardsPerPage || 2
        );

        if (result) {
          exportedFiles.push(result);
        }
      }

      // If multiple formats, create a ZIP; otherwise download single file
      if (exportedFiles.length > 1) {
        const zipBlob = await createZipArchive(exportedFiles);
        const timestamp = getCurrentDate();
        downloadBlob(zipBlob, `${timestamp}-${eventHeader}-export.zip`);
      } else if (exportedFiles.length === 1) {
        downloadBlob(exportedFiles[0].blob, exportedFiles[0].filename);
      }

      if (!cancelRef.current) {
        onComplete();
      }
    } catch (error) {
      console.error('Error during batch export:', error);
      onError('Error during export. Please try again.');
    } finally {
      setIsExporting(false);
      
      // Clear progress after a short delay
      setTimeout(() => {
        setExportProgress([]);
      }, 3000);
    }
  };

  return {
    isExporting,
    exportProgress,
    cardRefs,
    setCardRef,
    exportBatch,
    cancelExport,
  };
}
