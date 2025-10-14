'use client';

import React from "react";

interface PdfExporterProps {
  onExportBingoGame: () => void;
  onGeneratePDF: () => void;
  isGeneratingPDF: boolean;
  progress: number;
  estimatedTimeRemaining: number;
  onCancelPdf: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

/**
 * PdfExporter component for PDF and .bingoCards export controls.
 * 
 * This component is responsible for:
 * - Export to .bingoCards button
 * - Generate PDF button with loading state
 * - Progress bar with percentage
 * - Estimated time remaining display
 * - Cancel button during PDF generation
 */
export function PdfExporter({
  onExportBingoGame,
  onGeneratePDF,
  isGeneratingPDF,
  progress,
  estimatedTimeRemaining,
  onCancelPdf,
  t,
}: PdfExporterProps): React.JSX.Element {
  return (
    <>
      <h3>{t('bingoCards')}</h3>
      <button
        onClick={onExportBingoGame}
        className="button-style"
      >
        {t('exportBingoCards')}
      </button>
      <button
        onClick={onGeneratePDF}
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
            onClick={onCancelPdf}
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
    </>
  );
}
