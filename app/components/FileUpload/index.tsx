'use client';

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { CardsPerPage } from "../../utils/types";
import { getCurrentDate } from "../../utils/utils";
import { useBingoCards } from "../../hooks/useBingoCards";
import { usePdfGeneration } from "../../hooks/usePdfGeneration";
import { useFileUpload } from "../../hooks/useFileUpload";
import { CardGenerator } from "./CardGenerator";
import { PdfExporter } from "./PdfExporter";
import { CardDisplay } from "./CardDisplay";

/**
 * FileUpload component for managing bingo card generation and export.
 * 
 * This is the main container component that orchestrates:
 * - Custom hooks for state management (useBingoCards, usePdfGeneration, useFileUpload)
 * - Sub-components for UI rendering (CardGenerator, PdfExporter, CardDisplay)
 * 
 * @component
 */
export function FileUpload(): React.JSX.Element {
  const t = useTranslations('fileUpload');
  
  // Form state
  const [numCards, setNumCards] = useState<number>(10);
  const [bingoPercard, setBingoPercard] = useState<CardsPerPage>(2);
  const [eventHeader, setEventHeader] = useState<string>(
    `Magusto ${new Date().getFullYear()}`
  );
  const [locationFooter, setLocationFooter] = useState<string>(
    "Paróquia Nossa Senhora da Areosa"
  );

  // Custom hooks
  const {
    bingoCards,
    isGenerating,
    generateCards,
    parseCardsFromFile,
    exportBingoGame,
  } = useBingoCards();

  const {
    isGeneratingPDF,
    progress,
    estimatedTimeRemaining,
    qualityMode,
    setQualityMode,
    setCardRef,
    generatePDF,
    cancelPdfGeneration,
  } = usePdfGeneration();

  const { file, handleFileChange } = useFileUpload(
    parseCardsFromFile,
    (errorKey) => alert(t(errorKey))
  );

  // Handler functions
  const handleGenerateRandomCards = (): void => {
    generateCards(numCards, eventHeader);
  };

  const handleGeneratePDF = async (): Promise<void> => {
    await generatePDF(
      bingoCards,
      eventHeader,
      locationFooter,
      bingoPercard,
      (errorKey) => alert(t(errorKey)),
      (cancelKey) => alert(t(cancelKey))
    );
  };

  const handleExportBingoGame = (): void => {
    exportBingoGame(eventHeader);
  };

  return (
    <div className="container">
      <div className="file-upload">
        <h1>{t('title')}</h1>
        
        <CardGenerator
          numCards={numCards}
          setNumCards={setNumCards}
          bingoPercard={bingoPercard}
          setBingoPercard={setBingoPercard}
          qualityMode={qualityMode}
          setQualityMode={setQualityMode}
          eventHeader={eventHeader}
          setEventHeader={setEventHeader}
          locationFooter={locationFooter}
          setLocationFooter={setLocationFooter}
          onGenerateCards={handleGenerateRandomCards}
          isGenerating={isGenerating}
          t={t}
        />

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

        {bingoCards && (
          <div>
            <PdfExporter
              onExportBingoGame={handleExportBingoGame}
              onGeneratePDF={handleGeneratePDF}
              isGeneratingPDF={isGeneratingPDF}
              progress={progress}
              estimatedTimeRemaining={estimatedTimeRemaining}
              onCancelPdf={cancelPdfGeneration}
              t={t}
            />
            
            {bingoCards.cards.map((card, index) => (
              <CardDisplay
                key={card.cardTitle}
                card={card}
                cardRef={setCardRef(index)}
                cardNumber={`${getCurrentDate()}-${card.cardTitle}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
