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

type QualityMode = 'fast' | 'balanced' | 'high';

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
      };
      reader.readAsText(selectedFile);
    } else {
      alert(t('uploadError'));
    }
  };

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
      
      pdf.save(`${getCurrentDate()}-${eventHeader}.pdf`);
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

  const getCurrentDate = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}${month}${day}-${hours}${minutes}`;
  };

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
