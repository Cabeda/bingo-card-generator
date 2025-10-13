import React, { useCallback, useRef, useState } from "react";
import jsPDF from "jspdf";
import * as htmlToImage from "html-to-image";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Game } from "../utils/bingo.interface";
import { generateRandomBingoCards, parseBingoCards } from "../utils/utils";
import { 
  CardsPerPage, 
  createGameId,
  isValidCardsPerPage 
} from "../utils/types";
import { useToast } from "./ToastProvider";
import { LoadingOverlay } from "./LoadingOverlay";
import { ConfirmDialog } from "./ConfirmDialog";

type QualityMode = 'fast' | 'balanced' | 'high';

/**
 * FileUpload component for managing bingo card generation and export.
 * 
 * This component provides a complete interface for:
 * - Uploading and parsing `.bingoCards` files
 * - Generating random bingo cards with customizable quantities
 * - Exporting cards to PDF format with customizable layout (fast/balanced/high quality)
 * - Exporting cards to `.bingoCards` format for reuse
 * - Configuring event details (header, location, cards per page)
 * 
 * **Features:**
 * - Real-time card preview
 * - PDF generation with progress tracking and quality modes
 * - Cancellable PDF generation
 * - Batch image processing for efficient PDF creation
 * - Internationalization support
 * - Responsive card layout
 * 
 * @example
 * ```tsx
 * // Used in the main page
 * import { FileUpload } from './components/FileUpload';
 * 
 * export default function Home() {
 *   return <FileUpload />;
 * }
 * ```
 * 
 * @component
 * @see {@link parseBingoCards} for file parsing logic
 * @see {@link generateRandomBingoCards} for card generation
 */
export function FileUpload(): React.JSX.Element {
  const t = useTranslations('fileUpload');
  const { showSuccess, showError } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [bingoCards, setBingoCards] = useState<Game | null>(null);
  const [numCards, setNumCards] = useState<number>(10);
  const [bingoPercard, setBingoPercard] = useState<CardsPerPage>(2);
  const [eventHeader, setEventHeader] = useState<string>(
    `Magusto ${new Date().getFullYear()}`
  );
  const [locationFooter, setLocationFooter] = useState<string>(
    "Paróquia Nossa Senhora da Areosa"
  );
  const [progress, setProgress] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [qualityMode, setQualityMode] = useState<QualityMode>('balanced');
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>(0);
  const [batchInfo, setBatchInfo] = useState<string>("");
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);
  const cancelPdfRef = useRef<boolean>(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  /**
   * Handles file selection and parsing of `.bingoCards` files.
   * 
   * Validates that the selected file has the `.bingoCards` extension,
   * then reads and parses it using the FileReader API. Successfully
   * parsed cards are stored in component state for display and export.
   * 
   * @param event - React change event from file input element
   * 
   * @example
   * ```tsx
   * <input
   *   type="file"
   *   accept=".bingoCards"
   *   onChange={handleFileChange}
   * />
   * ```
   * 
   * @see {@link parseBingoCards} for the parsing logic
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile && selectedFile.name.endsWith(".bingoCards")) {
      setFile(selectedFile);
      const reader = new FileReader();
      const filename = selectedFile.name.replace(".bingoCards", "");
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const bingoGame = parseBingoCards(filename, content);
        setBingoCards(bingoGame);
        showSuccess(t('cardsGeneratedSuccess', { count: bingoGame.cards.length }));
      };
      reader.readAsText(selectedFile);
    } else {
      showError(t('uploadError'));
    }
  };

  /**
   * Generates a specified number of random bingo cards.
   * 
   * Creates new cards using the current configuration (number of cards,
   * event header) and stores them in component state. Shows a loading
   * indicator during generation.
   * 
   * @example
   * ```tsx
   * <button onClick={handleGenerateRandomCards}>
   *   Generate Bingo Cards
   * </button>
   * ```
   * 
   * @see {@link generateRandomBingoCards} for card generation logic
   */
  const handleGenerateRandomCards = (): void => {
    setIsGenerating(true);
    
    // Use setTimeout to allow UI to update before heavy operation
    setTimeout(() => {
      const generatedCards = generateRandomBingoCards(numCards);
      setBingoCards({
        filename: createGameId(`${getCurrentDate()}-${eventHeader}`),
        cards: generatedCards,
      });
      setIsGenerating(false);
      showSuccess(t('cardsGeneratedSuccess', { count: numCards }));
    }, 50);
  };

  // Callback to set card ref
  const setCardRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      cardRefs.current[index] = el;
    },
    []
  );

  /**
   * Generates a PDF document containing all bingo cards with optimized performance.
   * 
   * This function creates a professional PDF with:
   * - Configurable cards per page (1-3 cards)
   * - Quality mode selection (fast/balanced/high)
   * - Event header at the top of each page
   * - Location footer at the bottom of each page
   * - Progress tracking for long operations
   * - Cancellation support
   * 
   * **Performance Optimization:**
   * - Converts cards to images in parallel batches (100 cards at a time)
   * - Adjustable quality based on selected mode
   * - Shows real-time progress updates (0-80% conversion, 80-100% assembly)
   * - Estimated time remaining displayed during generation
   * 
   * **Process:**
   * 1. Convert all card DOM elements to PNG images in batches
   * 2. Add images to PDF pages with proper layout
   * 3. Add headers and footers to each page
   * 4. Save the final PDF file using blob approach (Firefox iOS compatible)
   * 
   * @async
   * @throws {Error} If PDF generation fails or DOM elements are unavailable
   * 
   * @example
   * ```tsx
   * <button onClick={generatePDF} disabled={isGeneratingPDF}>
   *   Generate PDF
   * </button>
   * ```
   * 
   * @see {@link htmlToImage.toPng} for DOM-to-image conversion
   */
  const generatePDF = async (): Promise<void> => {
    if (!bingoCards) return;
    
    setIsGeneratingPDF(true);
    setProgress(0);
    setEstimatedTimeRemaining(0);
    cancelPdfRef.current = false;
    
    try {
      const pdf = new jsPDF("p", "pt", "a4");
      const cardsPerPage = bingoPercard; // Use bingoPercard for cards per page
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
        cacheBust: false, // Disable cache busting for speed
      };

      // Pre-convert all card images in batches for parallel processing
      const allImageUrls: string[] = [];
      const startTime = performance.now();
      
      for (let batch = 0; batch < totalCards; batch += settings.batchSize) {
        // Check if cancelled
        if (cancelPdfRef.current) {
          console.log('PDF generation cancelled by user');
          setIsGeneratingPDF(false);
          setProgress(0);
          setEstimatedTimeRemaining(0);
          setBatchInfo("");
          showError(t('pdfCancelled'));
          return;
        }

        const batchStartTime = performance.now();
        const batchPromises = [];
        const currentBatch = Math.floor(batch / settings.batchSize) + 1;
        const totalBatches = Math.ceil(totalCards / settings.batchSize);
        setBatchInfo(t('processingBatch', { current: currentBatch, total: totalBatches }));
        
        for (let i = batch; i < Math.min(batch + settings.batchSize, totalCards); i++) {
          const cardRef = cardRefs.current[i];
          if (cardRef) {
            batchPromises.push(htmlToImage.toPng(cardRef, imgOptions));
          } else {
            console.warn(`Card ${i} ref is null, skipping`);
            batchPromises.push(Promise.resolve("")); // Empty placeholder
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
        setProgress((batch / totalCards) * 80); // 0-80% for image conversion
      }
      
      const imageConversionTime = performance.now();
      console.log(`Image conversion completed in ${Math.round(imageConversionTime - startTime)}ms`);
      setBatchInfo(t('assemblingPdf'));

      // Add images to PDF pages (fast operation)
      for (let i = 0; i < totalCards; i += cardsPerPage) {
        // Check if cancelled
        if (cancelPdfRef.current) {
          console.log('PDF generation cancelled by user');
          setIsGeneratingPDF(false);
          setProgress(0);
          setEstimatedTimeRemaining(0);
          setBatchInfo("");
          showError(t('pdfCancelled'));
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
            // Calculate dimensions synchronously
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
              "FAST" // Use fast compression
            );
          }
        }
        setProgress(80 + ((i + cardsPerPage) / totalCards) * 20); // 80-100% for PDF assembly
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
      URL.revokeObjectURL(element.href); // Clean up the blob URL
      
      setProgress(100);
      
      // Show success toast and reset after a short delay
      showSuccess(t('pdfGeneratedSuccess'));
      setTimeout(() => {
        setProgress(0);
        setIsGeneratingPDF(false);
        setEstimatedTimeRemaining(0);
        setBatchInfo("");
      }, 1000);
    } catch (error) {
      console.error("Error generating PDF:", error);
      showError(t('errorGeneratingPdf'));
      setIsGeneratingPDF(false);
      setProgress(0);
      setEstimatedTimeRemaining(0);
      setBatchInfo("");
    }
  };

  const cancelPdfGeneration = (): void => {
    cancelPdfRef.current = true;
  };

  /**
   * Generates a formatted date-time string for file naming.
   * 
   * Creates a timestamp in the format: `YYYYMMDD-HHMM`
   * This format is:
   * - Sortable (chronological ordering)
   * - Filesystem-safe (no special characters)
   * - Human-readable
   * - Suitable for use in filenames
   * 
   * @returns Formatted date-time string (e.g., "20241225-1430")
   * 
   * @example
   * ```typescript
   * const timestamp = getCurrentDate();
   * console.log(timestamp); // "20241225-1430"
   * 
   * const filename = `${timestamp}-${eventName}.pdf`;
   * // Result: "20241225-1430-Christmas-Bingo.pdf"
   * ```
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

  /**
   * Exports the current bingo game to a `.bingoCards` file.
   * 
   * Creates a downloadable file in the custom `.bingoCards` format:
   * - Cards are separated by pipe (`|`) characters
   * - Each card format: `|CardNo.{number};{num1};{num2};...`
   * - Empty cells are represented by empty strings between semicolons
   * - File is saved with UTF-8 encoding
   * 
   * The exported file can be re-imported later to restore the exact
   * same set of cards.
   * 
   * @example
   * ```tsx
   * <button onClick={exportBingoGame}>
   *   Export to .bingoCards
   * </button>
   * ```
   * 
   * **File format example:**
   * ```
   * |CardNo.1;1;;3;;5;6;;8;9;10;...|CardNo.2;2;11;;23;...
   * ```
   * 
   * @see {@link parseBingoCards} for importing these files
   */
  const exportBingoGame = (): void => {
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
    
    showSuccess(t('bingoCardsExportedSuccess'));
  };

  const handleClearCards = (): void => {
    setShowConfirmClear(true);
  };

  const confirmClearCards = (): void => {
    setBingoCards(null);
    setProgress(0);
    setShowConfirmClear(false);
    showSuccess(t('clear'));
  };

  return (
    <div className="container">
      {/* Loading overlay for card generation */}
      <LoadingOverlay
        isVisible={isGenerating}
        message={t('generating')}
        showProgress={false}
      />

      {/* Loading overlay for PDF generation */}
      <LoadingOverlay
        isVisible={isGeneratingPDF}
        message={estimatedTimeRemaining > 0 
          ? t('generatingPdfWithTime', { progress: Math.round(progress), timeRemaining: estimatedTimeRemaining })
          : t('generatingPdf', { progress: Math.round(progress) })}
        progress={progress}
        showProgress={true}
        subMessage={batchInfo}
        onCancel={cancelPdfGeneration}
        cancelText={t('cancelPdf')}
      />

      {/* Confirm dialog for clearing cards */}
      <ConfirmDialog
        isOpen={showConfirmClear}
        title={t('confirmClearCards')}
        message={t('confirmClearCardsMessage')}
        confirmText={t('clear')}
        cancelText={t('cancel')}
        confirmVariant="danger"
        onConfirm={confirmClearCards}
        onCancel={() => setShowConfirmClear(false)}
      />

      <div className="file-upload">
        <h1>{t('title')}</h1>
        <div className="margin-bottom-20">
          <label className="label-style">{t('numCards')}</label>
          <input
            type="number"
            value={numCards}
            onChange={(e) => setNumCards(parseInt(e.target.value, 10))}
            placeholder={t('numCardsPlaceholder')}
            min={1}
            className="input-style"
          />
        </div>
        <div className="margin-bottom-20">
          <label className="label-style">{t('cardsPerPage')}</label>
          <input
            type="range"
            value={bingoPercard}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (isValidCardsPerPage(value)) {
                setBingoPercard(value);
              }
            }}
            min={1}
            max={3}
            step={1}
            className="input-style"
          />
          <span>{bingoPercard}</span>
        </div>
        <div className="margin-bottom-20">
          <label className="label-style">{t('qualityMode')}</label>
          <select
            value={qualityMode}
            onChange={(e) => setQualityMode(e.target.value as QualityMode)}
            className="input-style"
            style={{ width: '100%' }}
          >
            <option value="fast">{t('qualityFast')}</option>
            <option value="balanced">{t('qualityBalanced')}</option>
            <option value="high">{t('qualityHigh')}</option>
          </select>
        </div>
        <div className="margin-bottom-20">
          <label className="label-style">{t('eventName')}</label>
          <input
            type="text"
            value={eventHeader}
            onChange={(e) => setEventHeader(e.target.value)}
            placeholder={t('eventNamePlaceholder')}
            className="input-style"
          />
        </div>
        <div className="margin-bottom-20">
          <label className="label-style">{t('location')}</label>
          <input
            type="text"
            value={locationFooter}
            onChange={(e) => setLocationFooter(e.target.value)}
            placeholder={t('locationPlaceholder')}
            className="input-style"
          />
        </div>
        <div className="margin-bottom-20 hidden">
          <label className="label-style">{t('uploadFile')}</label>
          <input
            type="file"
            accept=".bingoCards"
            onChange={handleFileChange}
            className="input-style"
          />
          {file && <p>{t('selectedFile', { filename: file.name })}</p>}
        </div>
        <div className="margin-bottom-20">
          <button 
            onClick={handleGenerateRandomCards} 
            className="button-style"
            disabled={isGenerating || isGeneratingPDF}
            style={{
              opacity: (isGenerating || isGeneratingPDF) ? 0.6 : 1,
              cursor: (isGenerating || isGeneratingPDF) ? "not-allowed" : "pointer",
            }}
          >
            {t('generateCards')}
          </button>
        </div>
        {bingoCards && (
          <div>
            <h3>{t('bingoCards')}</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <button
                onClick={exportBingoGame}
                className="button-style"
                disabled={isGeneratingPDF}
                style={{
                  opacity: isGeneratingPDF ? 0.6 : 1,
                  cursor: isGeneratingPDF ? "not-allowed" : "pointer",
                }}
              >
                {t('exportBingoCards')}
              </button>
              <button
                onClick={generatePDF}
                className="button-style"
                disabled={isGeneratingPDF}
                style={{
                  opacity: isGeneratingPDF ? 0.6 : 1,
                  cursor: isGeneratingPDF ? "not-allowed" : "pointer",
                }}
              >
                {t('generatePdf')}
              </button>
              <button
                onClick={handleClearCards}
                className="button-style"
                disabled={isGeneratingPDF}
                style={{
                  opacity: isGeneratingPDF ? 0.6 : 1,
                  cursor: isGeneratingPDF ? "not-allowed" : "pointer",
                  backgroundColor: "#d32f2f",
                }}
              >
                {t('clear')}
              </button>
            </div>
            {bingoCards.cards.map((card, index) => (
              <motion.div
                key={card.cardTitle}
                className="bingo-card"
                ref={setCardRef(index)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.3, 
                  delay: Math.min(index * 0.05, 2) // Stagger animation, max 2s delay
                }}
              >
                <div className="grid-container">
                  {card.numbers.map((num, idx) => (
                    <div
                      key={idx}
                      className={`bingo-cell ${num === null ? "empty" : ""}`}
                    >
                      {num !== null ? num : ""}
                    </div>
                  ))}
                </div>
                <p className="cardNumber">
                  {getCurrentDate()}-{card.cardTitle}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
