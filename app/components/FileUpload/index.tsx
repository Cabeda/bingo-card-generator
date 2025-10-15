'use client';

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { CardsPerPage } from "../../utils/types";
import { getCurrentDate } from "../../utils/utils";
import { useBingoCards } from "../../hooks/useBingoCards";
import { usePdfGeneration } from "../../hooks/usePdfGeneration";
import { useFileUpload } from "../../hooks/useFileUpload";
import { useToast } from "../ToastProvider";
import { useCardTheme } from "../ThemeProvider";
import { LoadingOverlay } from "../LoadingOverlay";
import { ConfirmDialog } from "../ConfirmDialog";
import { ThemeSelector } from "../ThemeSelector";
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
  const { showSuccess, showError } = useToast();
  const { currentTheme } = useCardTheme();
  
  // Form state
  const [numCards, setNumCards] = useState<number>(10);
  const [bingoPercard, setBingoPercard] = useState<CardsPerPage>(2);
  const [eventHeader, setEventHeader] = useState<string>(
    `Magusto ${new Date().getFullYear()}`
  );
  const [locationFooter, setLocationFooter] = useState<string>(
    "Paróquia Nossa Senhora da Areosa"
  );
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);

  // Custom hooks
  const {
    bingoCards,
    isGenerating,
    generateCards,
    parseCardsFromFile,
    exportBingoGame,
    clearCards,
  } = useBingoCards();

  const {
    isGeneratingPDF,
    progress,
    estimatedTimeRemaining,
    batchInfo,
    qualityMode,
    setQualityMode,
    setCardRef,
    generatePDF,
    cancelPdfGeneration,
  } = usePdfGeneration();

  const { file, handleFileChange } = useFileUpload(
    parseCardsFromFile,
    (errorKey) => showError(t(errorKey)),
    (count) => showSuccess(t('cardsGeneratedSuccess', { count }))
  );

  // Handler functions
  const handleGenerateRandomCards = (): void => {
    const game = generateCards(numCards, eventHeader);
    if (game) {
      showSuccess(t('cardsGeneratedSuccess', { count: numCards }));
    }
  };

  const handleGeneratePDF = async (): Promise<void> => {
    await generatePDF(
      bingoCards,
      eventHeader,
      locationFooter,
      bingoPercard,
      (errorKey) => showError(t(errorKey)),
      (cancelKey) => showError(t(cancelKey)),
      () => showSuccess(t('pdfGeneratedSuccess'))
    );
  };

  const handleExportBingoGame = (): void => {
    exportBingoGame(eventHeader);
    showSuccess(t('bingoCardsExportedSuccess'));
  };

  const handleClearCards = (): void => {
    setShowConfirmClear(true);
  };

  const confirmClearCards = (): void => {
    clearCards();
    setShowConfirmClear(false);
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

      <section className="file-upload" aria-labelledby="main-title">
        <h1 id="main-title">{t('title')}</h1>
        
        {/* Theme Selector */}
        <ThemeSelector />
        
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
          isGeneratingPDF={isGeneratingPDF}
          t={t}
        />

        <div className="margin-bottom-20 hidden">
          <label htmlFor="file-upload-input" className="label-style">{t('uploadFile')}</label>
          <input
            id="file-upload-input"
            type="file"
            accept=".bingoCards"
            onChange={handleFileChange}
            className="input-style"
            aria-describedby="file-upload-help"
          />
          <span id="file-upload-help" className="sr-only">
            Upload a .bingoCards file to import previously generated cards
          </span>
          {file && <p>{t('selectedFile', { filename: file.name })}</p>}
        </div>

        {bingoCards && (
          <div>
            <PdfExporter
              onExportBingoGame={handleExportBingoGame}
              onGeneratePDF={handleGeneratePDF}
              onClearCards={handleClearCards}
              isGeneratingPDF={isGeneratingPDF}
              t={t}
            />
            
            <section aria-label="Generated bingo cards">
              {bingoCards.cards.map((card, index) => (
                <motion.div
                  key={card.cardTitle}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: Math.min(index * 0.05, 2)
                  }}
                >
                  <CardDisplay
                    card={card}
                    cardRef={setCardRef(index)}
                    cardNumber={`${getCurrentDate()}-${card.cardTitle}`}
                    theme={currentTheme}
                  />
                </motion.div>
              ))}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
