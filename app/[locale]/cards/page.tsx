'use client';

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "../../routing";
import { motion } from "motion/react";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { ExportConfiguration } from "../../components/ExportConfiguration";
import { LoadingOverlay } from "../../components/LoadingOverlay";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { PdfExporter } from "../../components/FileUpload/PdfExporter";
import { CardDisplay } from "../../components/FileUpload/CardDisplay";
import { usePdfGeneration } from "../../hooks/usePdfGeneration";
import { useToast } from "../../components/ToastProvider";
import { CardsPerPage } from "../../utils/types";
import { getCurrentDate } from "../../utils/utils";
import { Game } from "../../utils/bingo.interface";

export default function CardsPage(): React.JSX.Element {
  const t = useTranslations('fileUpload');
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  
  // State from session storage
  const [bingoCards, setBingoCards] = useState<Game | null>(null);
  const [bingoPercard, setBingoPercard] = useState<CardsPerPage>(2);
  const [eventHeader, setEventHeader] = useState<string>(
    `Magusto ${new Date().getFullYear()}`
  );
  const [locationFooter, setLocationFooter] = useState<string>(
    "Paróquia Nossa Senhora da Areosa"
  );
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);

  // PDF generation hook
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

  // Load cards from sessionStorage on mount
  useEffect(() => {
    const storedGame = sessionStorage.getItem('bingoGame');
    if (storedGame) {
      try {
        const game: Game = JSON.parse(storedGame);
        setBingoCards(game);
      } catch (error) {
        console.error('Error loading game from session storage:', error);
        router.push('/');
      }
    } else {
      // No cards found, redirect to home
      router.push('/');
    }
  }, [router]);

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
    sessionStorage.removeItem('bingoGame');
    sessionStorage.removeItem('numCards');
    setShowConfirmClear(false);
    router.push('/');
  };

  // Don't render until we have cards
  if (!bingoCards) {
    return (
      <main style={{ viewTransitionName: 'cards-page' }}>
        <ErrorBoundary>
          <div className="container">
            <LoadingOverlay
              isVisible={true}
              message={t('generating')}
              showProgress={false}
            />
          </div>
        </ErrorBoundary>
      </main>
    );
  }

  return (
    <main style={{ viewTransitionName: 'cards-page' }}>
      <ErrorBoundary>
        <div className="container">
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
            <h1>{t('bingoCards')}</h1>

            <h3>{t('exportOptions')}</h3>
            <ExportConfiguration
              bingoPercard={bingoPercard}
              setBingoPercard={setBingoPercard}
              qualityMode={qualityMode}
              setQualityMode={setQualityMode}
              eventHeader={eventHeader}
              setEventHeader={setEventHeader}
              locationFooter={locationFooter}
              setLocationFooter={setLocationFooter}
              t={t}
            />
            
            <PdfExporter
              onExportBingoGame={handleExportBingoGame}
              onGeneratePDF={handleGeneratePDF}
              onClearCards={handleClearCards}
              isGeneratingPDF={isGeneratingPDF}
              t={t}
            />
            
            {/* Cap the number of animated cards for performance */}
            {bingoCards.cards.map((card, index) => {
              const MAX_ANIMATED_CARDS = 20;
              const delay = index < MAX_ANIMATED_CARDS ? index * 0.05 : 0;
              return (
                <motion.div
                  key={card.cardTitle}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.3, 
                    delay
                  }}
                >
                  <CardDisplay
                    card={card}
                    cardRef={setCardRef(index)}
                    cardNumber={`${getCurrentDate()}-${card.cardTitle}`}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      </ErrorBoundary>
    </main>
  );
}
