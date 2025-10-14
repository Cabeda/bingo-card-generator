import { useCallback, useRef, useState } from "react";
import jsPDF from "jspdf";
import * as htmlToImage from "html-to-image";
import { Game } from "../utils/bingo.interface";
import { CardsPerPage } from "../utils/types";
import { getCurrentDate } from "../utils/utils";

type QualityMode = 'fast' | 'balanced' | 'high';

/**
 * Custom hook for managing PDF generation with progress tracking.
 * 
 * This hook encapsulates all logic related to:
 * - PDF generation with quality modes
 * - Progress tracking and estimated time remaining
 * - Cancellation support
 * - Batch image processing for performance
 * 
 * @returns Object containing:
 *   - isGeneratingPDF: Loading state during PDF generation
 *   - progress: Progress percentage (0-100)
 *   - estimatedTimeRemaining: Estimated seconds remaining
 *   - qualityMode: Current quality mode setting
 *   - setQualityMode: Function to set quality mode
 *   - cardRefs: Ref array for DOM elements
 *   - setCardRef: Callback to set individual card ref
 *   - generatePDF: Function to generate PDF
 *   - cancelPdfGeneration: Function to cancel PDF generation
 */
export function usePdfGeneration() {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>(0);
  const [qualityMode, setQualityMode] = useState<QualityMode>('balanced');
  const cancelPdfRef = useRef<boolean>(false);
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
   * Cancels the current PDF generation.
   */
  const cancelPdfGeneration = (): void => {
    cancelPdfRef.current = true;
  };

  /**
   * Generates a PDF document containing all bingo cards.
   * 
   * @param bingoCards - Game object containing cards to export
   * @param eventHeader - Event name for header
   * @param locationFooter - Location text for footer
   * @param bingoPercard - Number of cards per PDF page
   * @param onError - Error callback for displaying error messages
   * @param onCancel - Cancel callback for displaying cancel message
   */
  const generatePDF = async (
    bingoCards: Game | null,
    eventHeader: string,
    locationFooter: string,
    bingoPercard: CardsPerPage,
    onError: (message: string) => void,
    onCancel: (message: string) => void
  ): Promise<void> => {
    if (!bingoCards) return;
    
    setIsGeneratingPDF(true);
    setProgress(0);
    setEstimatedTimeRemaining(0);
    cancelPdfRef.current = false;
    
    try {
      const pdf = new jsPDF("p", "pt", "a4");
      const cardsPerPage = bingoPercard;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const totalCards = bingoCards.cards.length;
      
      // Wait for DOM to be ready
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      // Quality settings based on selected mode
      const qualitySettings = {
        fast: { quality: 0.5, pixelRatio: 1, batchSize: 50 },
        balanced: { quality: 0.7, pixelRatio: 1.5, batchSize: 30 },
        high: { quality: 0.95, pixelRatio: 2, batchSize: 20 },
      };
      
      const settings = qualitySettings[qualityMode];
      const imgOptions = {
        quality: settings.quality,
        pixelRatio: settings.pixelRatio,
        skipFonts: true,
        cacheBust: false,
      };

      // Pre-convert all card images in batches
      const allImageUrls: string[] = [];
      const startTime = performance.now();
      
      for (let batch = 0; batch < totalCards; batch += settings.batchSize) {
        // Check if cancelled
        if (cancelPdfRef.current) {
          console.log('PDF generation cancelled by user');
          setIsGeneratingPDF(false);
          setProgress(0);
          setEstimatedTimeRemaining(0);
          onCancel('pdfCancelled');
          return;
        }

        const batchStartTime = performance.now();
        const batchPromises = [];
        for (let i = batch; i < Math.min(batch + settings.batchSize, totalCards); i++) {
          const cardRef = cardRefs.current[i];
          if (cardRef) {
            batchPromises.push(htmlToImage.toPng(cardRef, imgOptions));
          } else {
            console.warn(`Card ${i} ref is null, skipping`);
            batchPromises.push(Promise.resolve(""));
          }
        }
        const batchResults = await Promise.all(batchPromises);
        allImageUrls.push(...batchResults);
        const batchEndTime = performance.now();
        
        // Calculate estimated time remaining
        const elapsedTime = batchEndTime - startTime;
        const processedCards = batch + batchResults.length;
        const progressRatio = processedCards / totalCards;
        const estimatedTotalTime = elapsedTime / progressRatio;
        const timeRemaining = Math.ceil((estimatedTotalTime - elapsedTime) / 1000);
        setEstimatedTimeRemaining(timeRemaining > 0 ? timeRemaining : 0);
        
        console.log(`Batch ${Math.floor(batch/settings.batchSize) + 1} (${batchResults.length} cards) took ${Math.round(batchEndTime - batchStartTime)}ms`);
        setProgress((batch / totalCards) * 80);
      }
      
      const imageConversionTime = performance.now();
      console.log(`Image conversion completed in ${Math.round(imageConversionTime - startTime)}ms`);

      // Add images to PDF pages
      for (let i = 0; i < totalCards; i += cardsPerPage) {
        // Check if cancelled
        if (cancelPdfRef.current) {
          console.log('PDF generation cancelled by user');
          setIsGeneratingPDF(false);
          setProgress(0);
          setEstimatedTimeRemaining(0);
          onCancel('pdfCancelled');
          return;
        }

        if (i > 0) {
          pdf.addPage();
        }
        pdf.text(eventHeader, pageWidth / 2, 30, { align: "center" });
        pdf.text(locationFooter, pageWidth / 2, pageHeight - 30, {
          align: "center",
        });

        for (let j = 0; j < cardsPerPage; j++) {
          const cardIndex = i + j;
          if (cardIndex >= totalCards) break;
          const imgDataUrl = allImageUrls[cardIndex];
          if (imgDataUrl) {
            const img = new Image();
            img.src = imgDataUrl;
            const imgWidth = pageWidth - 40;
            const cardRef = cardRefs.current[cardIndex];
            const cardWidth = cardRef?.offsetWidth || 400;
            const cardHeight = cardRef?.offsetHeight || 400;
            const imgHeight = cardHeight * (imgWidth / cardWidth);
            const positionY = j * (pageHeight / cardsPerPage) + 50;
            
            pdf.addImage(
              imgDataUrl,
              "PNG",
              20,
              positionY,
              imgWidth,
              imgHeight,
              undefined,
              "FAST"
            );
          }
        }
        setProgress(80 + ((i + cardsPerPage) / totalCards) * 20);
      }
      
      const endTime = performance.now();
      console.log(`PDF generation completed in ${Math.round(endTime - startTime)}ms`);
      
      // Use blob approach for better iOS compatibility
      const pdfBlob = pdf.output('blob');
      const filename = `${getCurrentDate()}-${eventHeader}.pdf`;
      
      const element = document.createElement("a");
      element.href = URL.createObjectURL(pdfBlob);
      element.download = filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href);
      
      setProgress(100);
      
      // Reset after a short delay
      setTimeout(() => {
        setProgress(0);
        setIsGeneratingPDF(false);
        setEstimatedTimeRemaining(0);
      }, 1000);
    } catch (error) {
      console.error("Error generating PDF:", error);
      onError('errorGeneratingPdf');
      setIsGeneratingPDF(false);
      setProgress(0);
      setEstimatedTimeRemaining(0);
    }
  };

  return {
    isGeneratingPDF,
    progress,
    estimatedTimeRemaining,
    qualityMode,
    setQualityMode,
    cardRefs,
    setCardRef,
    generatePDF,
    cancelPdfGeneration,
  };
}
