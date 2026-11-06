import { useCallback, useRef, useState } from "react";
import { Game } from "../utils/bingo.interface";
import { CardTheme } from "../utils/bingo.interface";
import { CardsPerPage } from "../utils/types";
import { getCurrentDate } from "../utils/utils";
import { buildPdf } from "../utils/pdf/vectorPdf";
import { useCardTheme } from "../components/ThemeProvider";

type QualityMode = "fast" | "balanced" | "high";

export function usePdfGeneration() {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>(0);
  const [batchInfo, setBatchInfo] = useState<string>("");
  const [qualityMode, setQualityMode] = useState<QualityMode>("balanced");
  const cancelPdfRef = useRef<boolean>(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { currentTheme } = useCardTheme();

  const setCardRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      cardRefs.current[index] = el;
    },
    [],
  );

  const cancelPdfGeneration = (): void => {
    cancelPdfRef.current = true;
  };

  const runDirect = async (
    bingoCards: Game,
    eventHeader: string,
    locationFooter: string,
    bingoPercard: CardsPerPage,
    theme: CardTheme,
    onError: (message: string) => void,
    onCancel: (message: string) => void,
    onSuccess: () => void,
  ): Promise<void> => {
    try {
      const blob = buildPdf({
        cards: bingoCards.cards,
        header: eventHeader,
        footer: locationFooter,
        cardsPerPage: bingoPercard,
        theme,
        onProgress: (p) => setProgress(p),
        isCancelled: () => cancelPdfRef.current,
      });

      if (cancelPdfRef.current) {
        setIsGeneratingPDF(false);
        setProgress(0);
        setEstimatedTimeRemaining(0);
        setBatchInfo("");
        onCancel("pdfCancelled");
        return;
      }

      downloadBlob(blob, `${getCurrentDate()}-${eventHeader}.pdf`);
      setProgress(100);
      onSuccess();
      setTimeout(() => {
        setProgress(0);
        setIsGeneratingPDF(false);
        setEstimatedTimeRemaining(0);
        setBatchInfo("");
      }, 300);
    } catch (error) {
      if (error instanceof Error && error.message === "__cancelled__") {
        setIsGeneratingPDF(false);
        setProgress(0);
        setEstimatedTimeRemaining(0);
        setBatchInfo("");
        onCancel("pdfCancelled");
        return;
      }
      console.error("Error generating PDF:", error);
      onError("errorGeneratingPdf");
      setIsGeneratingPDF(false);
      setProgress(0);
      setEstimatedTimeRemaining(0);
      setBatchInfo("");
    }
  };

  const runWorker = async (
    bingoCards: Game,
    eventHeader: string,
    locationFooter: string,
    bingoPercard: CardsPerPage,
    theme: CardTheme,
  ): Promise<Blob> => {
    const mod = await import("../utils/pdf/workerBridge");
    return mod.runWorkerPdf(
      bingoCards,
      eventHeader,
      locationFooter,
      bingoPercard,
      theme,
      (p) => setProgress(p),
      () => cancelPdfRef.current,
    );
  };

  const generatePDF = async (
    bingoCards: Game | null,
    eventHeader: string,
    locationFooter: string,
    bingoPercard: CardsPerPage,
    onError: (message: string) => void,
    onCancel: (message: string) => void,
    onSuccess: () => void,
  ): Promise<void> => {
    if (!bingoCards) return;

    setIsGeneratingPDF(true);
    setProgress(0);
    setEstimatedTimeRemaining(0);
    setBatchInfo("");
    cancelPdfRef.current = false;

    const theme: CardTheme = currentTheme;

    const useWorker =
      typeof Worker !== "undefined" && !process.env.JEST_WORKER_ID;

    if (useWorker) {
      try {
        const blob = await runWorker(
          bingoCards,
          eventHeader,
          locationFooter,
          bingoPercard,
          theme,
        );
        if (cancelPdfRef.current) {
          setIsGeneratingPDF(false);
          setProgress(0);
          setEstimatedTimeRemaining(0);
          setBatchInfo("");
          onCancel("pdfCancelled");
          return;
        }
        downloadBlob(blob, `${getCurrentDate()}-${eventHeader}.pdf`);
        setProgress(100);
        onSuccess();
        setTimeout(() => {
          setProgress(0);
          setIsGeneratingPDF(false);
          setEstimatedTimeRemaining(0);
          setBatchInfo("");
        }, 300);
        return;
      } catch (error) {
        if (error instanceof Error && error.message === "__cancelled__") {
          setIsGeneratingPDF(false);
          setProgress(0);
          setEstimatedTimeRemaining(0);
          setBatchInfo("");
          onCancel("pdfCancelled");
          return;
        }
        // fall through to direct on worker failure
      }
    }

    await runDirect(
      bingoCards,
      eventHeader,
      locationFooter,
      bingoPercard,
      theme,
      onError,
      onCancel,
      onSuccess,
    );
  };

  return {
    isGeneratingPDF,
    progress,
    estimatedTimeRemaining,
    batchInfo,
    qualityMode,
    setQualityMode,
    cardRefs,
    setCardRef,
    generatePDF,
    cancelPdfGeneration,
  };
}

function downloadBlob(blob: Blob, filename: string): void {
  const element = document.createElement("a");
  element.href = URL.createObjectURL(blob);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(element.href);
}
