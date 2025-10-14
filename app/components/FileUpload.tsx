import React, { useCallback, useRef, useState } from "react";
import jsPDF from "jspdf";
import * as htmlToImage from "html-to-image";
import { useTranslations } from "next-intl";
import { Game } from "../utils/bingo.interface";
import { generateRandomBingoCards, parseBingoCards } from "../utils/utils";
import { 
  CardsPerPage, 
  createGameId,
  isValidCardsPerPage 
} from "../utils/types";
import {
  getUserFriendlyErrorMessage,
  sanitizeFilename,
  validateBingoCardsFile
} from "../utils/fileValidation";

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

    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      // Perform comprehensive validation
      const validationResult = validateBingoCardsFile(selectedFile, content);
      
      if (!validationResult.isValid && validationResult.error) {
        // Show user-friendly error message
        const errorMessage = getUserFriendlyErrorMessage(validationResult.error);
        alert(errorMessage);
        
        // Log technical details for debugging
        console.error('File validation error:', validationResult.error);
        
        // Clear the file input
        setFile(null);
        event.target.value = '';
        return;
      }
      
      // Sanitize filename before using it
      const sanitizedFilename = sanitizeFilename(selectedFile.name.replace(".bingoCards", ""));
      
      // Parse and set the bingo cards
      try {
        const bingoGame = parseBingoCards(sanitizedFilename, content);
        setBingoCards(bingoGame);
      } catch (error) {
        alert(t('uploadError'));
        console.error('Error parsing bingo cards:', error);
        setFile(null);
        event.target.value = '';
      }
    };
    
    reader.onerror = () => {
      alert(t('uploadError'));
      console.error('Error reading file');
      setFile(null);
      event.target.value = '';
    };
    
    reader.readAsText(selectedFile);
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
    
    const generatedCards = generateRandomBingoCards(numCards);
    setBingoCards({
      filename: createGameId(`${getCurrentDate()}-${eventHeader}`),
      cards: generatedCards,
    });
    setIsGenerating(false);
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
          alert(t('pdfCancelled'));
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

      // Add images to PDF pages (fast operation)
      for (let i = 0; i < totalCards; i += cardsPerPage) {
        // Check if cancelled
        if (cancelPdfRef.current) {
          console.log('PDF generation cancelled by user');
          setIsGeneratingPDF(false);
          setProgress(0);
          setEstimatedTimeRemaining(0);
          alert(t('pdfCancelled'));
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
      
      // Reset after a short delay
      setTimeout(() => {
        setProgress(0);
        setIsGeneratingPDF(false);
        setEstimatedTimeRemaining(0);
      }, 1000);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(t('errorGeneratingPdf'));
      setIsGeneratingPDF(false);
      setProgress(0);
      setEstimatedTimeRemaining(0);
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
  };

  return (
    <div className="container">
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
          <button onClick={handleGenerateRandomCards} className="button-style">
            {t('generateCards')}
          </button>
        </div>
        {isGenerating && (
          <div
            className="margin-bottom-20"
            style={{ textAlign: "center" }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid var(--primary-color)",
                borderTopColor: "transparent",
                borderRadius: "50%",
                margin: "0 auto",
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ marginTop: "10px", color: "var(--primary-color)" }}>
              {t('generating')}
            </p>
          </div>
        )}
        {bingoCards && (
          <div>
            <h3>{t('bingoCards')}</h3>
            <button
              onClick={exportBingoGame}
              className="button-style"
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
            {isGeneratingPDF && (
              <div
                className="margin-bottom-20"
                style={{ textAlign: "center", marginTop: "20px" }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    border: "4px solid var(--primary-color)",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    margin: "0 auto",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <p style={{ marginTop: "10px", color: "var(--primary-color)" }}>
                  {estimatedTimeRemaining > 0 
                    ? t('generatingPdfWithTime', { progress: Math.round(progress), timeRemaining: estimatedTimeRemaining })
                    : t('generatingPdf', { progress: Math.round(progress) })}
                </p>
                <button
                  onClick={cancelPdfGeneration}
                  className="button-style"
                  style={{ marginTop: "10px", backgroundColor: "#d32f2f" }}
                >
                  {t('cancelPdf')}
                </button>
              </div>
            )}
            {progress > 0 && progress < 100 && !isGeneratingPDF && (
              <div className="margin-bottom-20">
                <div className="progress-bar-container">
                  <div
                    className="progress-bar"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p>{Math.round(progress)}%</p>
              </div>
            )}
            {bingoCards.cards.map((card, index) => (
              <div
                key={card.cardTitle}
                className="bingo-card"
                ref={setCardRef(index)}
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
