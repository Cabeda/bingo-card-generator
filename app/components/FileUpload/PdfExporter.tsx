'use client';

import React from "react";

interface PdfExporterProps {
  onExportBingoGame: () => void;
  onGeneratePDF: () => void;
  onClearCards: () => void;
  isGeneratingPDF: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
}

/**
 * PdfExporter component for PDF and .bingoCards export controls.
 * 
 * This component is responsible for:
 * - Export to .bingoCards button
 * - Generate PDF button
 * - Clear cards button
 */
export function PdfExporter({
  onExportBingoGame,
  onGeneratePDF,
  onClearCards,
  isGeneratingPDF,
  t,
}: PdfExporterProps): React.JSX.Element {
  return (
    <>
      <h3>{t('bingoCards')}</h3>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button
          onClick={onExportBingoGame}
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
        <button
          onClick={onClearCards}
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
    </>
  );
}
