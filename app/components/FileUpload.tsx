import React, { useState, useRef, useCallback } from "react";
import jsPDF from "jspdf";
import * as htmlToImage from "html-to-image";
import { Game } from "../utils/bingo.interface";
import { parseBingoCards, generateRandomBingoCards } from "../utils/utils";

/**
 * FileUpload component for managing bingo card generation and export.
 * 
 * This component provides a complete interface for:
 * - Uploading and parsing `.bingoCards` files
 * - Generating random bingo cards with customizable quantities
 * - Exporting cards to PDF format with customizable layout
 * - Exporting cards to `.bingoCards` format for reuse
 * - Configuring event details (header, location, cards per page)
 * 
 * **Features:**
 * - Real-time card preview
 * - PDF generation with progress tracking
 * - Batch image processing for efficient PDF creation
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
export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [bingoCards, setBingoCards] = useState<Game | null>(null);
  const [numCards, setNumCards] = useState<number>(10);
  const [bingoPercard, setBingoPercard] = useState<number>(2); // New state for bingoPercard
  const [eventHeader, setEventHeader] = useState<string>(
    `Magusto ${new Date().getFullYear()}`
  );
  const [locationFooter, setLocationFooter] = useState<string>(
    "Paróquia Nossa Senhora da Areosa"
  );
  const [progress, setProgress] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
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
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile && selectedFile.name.endsWith(".bingoCards")) {
      setFile(selectedFile);
      const reader = new FileReader();
      const filename = selectedFile.name.replace(".bingoCards", "");
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const bingoGame = parseBingoCards(filename, content);
        setBingoCards(bingoGame);
      };
      reader.readAsText(selectedFile);
    } else {
      alert("Please upload a file with the .bingoCards extension.");
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
  const handleGenerateRandomCards = () => {
    setIsGenerating(true);
    
    const generatedCards = generateRandomBingoCards(numCards);
    setBingoCards({
      filename: `${getCurrentDate()}-${eventHeader}`,
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
   * - Event header at the top of each page
   * - Location footer at the bottom of each page
   * - Progress tracking for long operations
   * 
   * **Performance Optimization:**
   * - Converts cards to images in parallel batches (100 cards at a time)
   * - Uses reduced quality (0.7) for faster processing
   * - Shows real-time progress updates (0-80% conversion, 80-100% assembly)
   * - Typically processes 1000+ cards in under a few seconds
   * 
   * **Process:**
   * 1. Convert all card DOM elements to PNG images in batches
   * 2. Add images to PDF pages with proper layout
   * 3. Add headers and footers to each page
   * 4. Save the final PDF file
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
  const generatePDF = async () => {
    if (!bingoCards) return;
    
    setIsGeneratingPDF(true);
    setProgress(0);
    
    try {
      const pdf = new jsPDF("p", "pt", "a4");
      const cardsPerPage = bingoPercard; // Use bingoPercard for cards per page
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const totalCards = bingoCards.cards.length;
      
      // Wait for DOM to be ready
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      // Batch size for parallel processing
      const batchSize = 100; // Increased from 5 to 10 for faster processing
      const imgOptions = {
        quality: 0.7, // Reduced from 1 to 0.95 for faster processing with minimal quality loss
        pixelRatio: 2, // Use 2x pixel ratio for crisp images
        skipFonts: true,
        cacheBust: false, // Disable cache busting for speed
      };

      // Pre-convert all card images in batches for parallel processing
      const allImageUrls: string[] = [];
      const startTime = performance.now();
      
      for (let batch = 0; batch < totalCards; batch += batchSize) {
        const batchStartTime = performance.now();
        const batchPromises = [];
        for (let i = batch; i < Math.min(batch + batchSize, totalCards); i++) {
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
        console.log(`Batch ${Math.floor(batch/batchSize) + 1} (${batchResults.length} cards) took ${Math.round(batchEndTime - batchStartTime)}ms`);
        setProgress((batch / totalCards) * 80); // 0-80% for image conversion
      }
      
      const imageConversionTime = performance.now();
      console.log(`Image conversion completed in ${Math.round(imageConversionTime - startTime)}ms`);

      // Add images to PDF pages (fast operation)
      for (let i = 0; i < totalCards; i += cardsPerPage) {
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
      
      pdf.save(`${getCurrentDate()}-${eventHeader}.pdf`);
      setProgress(100);
      
      // Reset after a short delay
      setTimeout(() => {
        setProgress(0);
        setIsGeneratingPDF(false);
      }, 1000);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Erro ao gerar PDF. Por favor, tente novamente.");
      setIsGeneratingPDF(false);
      setProgress(0);
    }
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
  const getCurrentDate = () => {
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
  const exportBingoGame = () => {
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
        <h1>Gerador de cartões de Bingo</h1>
        <div className="margin-bottom-20">
          <label className="label-style">Número de cartões</label>
          <input
            type="number"
            value={numCards}
            onChange={(e) => setNumCards(parseInt(e.target.value, 10))}
            placeholder="Número de cartões"
            min={1}
            className="input-style"
          />
        </div>
        <div className="margin-bottom-20">
          <label className="label-style">Cartões por página</label>
          <input
            type="range"
            value={bingoPercard}
            onChange={(e) => setBingoPercard(parseInt(e.target.value, 10))}
            min={1}
            max={3}
            step={1}
            className="input-style"
          />
          <span>{bingoPercard}</span>
        </div>
        <div className="margin-bottom-20">
          <label className="label-style">Nome do evento</label>
          <input
            type="text"
            value={eventHeader}
            onChange={(e) => setEventHeader(e.target.value)}
            placeholder="Event Header"
            className="input-style"
          />
        </div>
        <div className="margin-bottom-20">
          <label className="label-style">Local</label>
          <input
            type="text"
            value={locationFooter}
            onChange={(e) => setLocationFooter(e.target.value)}
            placeholder="Location Footer"
            className="input-style"
          />
        </div>
        <div className="margin-bottom-20 hidden">
          <label className="label-style">Upload .bingoCards File:</label>
          <input
            type="file"
            accept=".bingoCards"
            onChange={handleFileChange}
            className="input-style"
          />
          {file && <p>Selected file: {file.name}</p>}
        </div>
        <div className="margin-bottom-20">
          <button onClick={handleGenerateRandomCards} className="button-style">
            Gerar cartões de Bingo
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
              A gerar cartões...
            </p>
          </div>
        )}
        {bingoCards && (
          <div>
            <h3>Cartões de bingo</h3>
            <button
              onClick={exportBingoGame}
              className="button-style"
            >
              Gerar .bingoCards
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
              Gerar PDF
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
                  A gerar PDF... {Math.round(progress)}%
                </p>
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
