'use client';

import React from "react";

interface PdfExporterProps {
  onExportBingoGame: () => void;
  onGeneratePDF: () => void;
  onBatchExport: () => void;
  onClearCards: () => void;
  isGeneratingPDF: boolean;
  isExporting: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
}

/**
 * PdfExporter component for PDF and .bingoCards export controls.
 * 
 * This component is responsible for:
 * - Export to .bingoCards button
 * - Generate PDF button
 * - Batch export button
 * - Clear cards button
 */
export function PdfExporter({
  onExportBingoGame,
  onGeneratePDF,
  onBatchExport,
  onClearCards,
  isGeneratingPDF,
  isExporting,
  t,
}: PdfExporterProps): React.JSX.Element {
  const isDisabled = isGeneratingPDF || isExporting;
  
  return (
    <>
      <h3>{t('bingoCards')}</h3>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button
          onClick={onExportBingoGame}
          className="button-style"
          disabled={isDisabled}
          style={{
            opacity: isDisabled ? 0.6 : 1,
            cursor: isDisabled ? "not-allowed" : "pointer",
          }}
        >
          {t('exportBingoCards')}
        </button>
        <button
          onClick={onGeneratePDF}
          className="button-style"
          disabled={isDisabled}
          style={{
            opacity: isDisabled ? 0.6 : 1,
            cursor: isDisabled ? "not-allowed" : "pointer",
          }}
        >
          {t('generatePdf')}
        </button>
        <button
          onClick={onBatchExport}
          className="button-style"
          disabled={isDisabled}
          style={{
            opacity: isDisabled ? 0.6 : 1,
            cursor: isDisabled ? "not-allowed" : "pointer",
            backgroundColor: "#2e7d32",
          }}
        >
          {t('batchExport') || 'Batch Export...'}
        </button>
        <button
          onClick={onClearCards}
          className="button-style"
          disabled={isDisabled}
          style={{
            opacity: isDisabled ? 0.6 : 1,
            cursor: isDisabled ? "not-allowed" : "pointer",
            backgroundColor: "#d32f2f",
          }}
        >
          {t('clear')}
        </button>
      </div>
    </>
  );
}
