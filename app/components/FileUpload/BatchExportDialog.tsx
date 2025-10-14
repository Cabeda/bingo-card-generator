'use client';

import React, { useState } from 'react';
import { CardsPerPage, ExportFormat, QualityMode } from '../../utils/types';

interface BatchExportDialogProps {
  isOpen: boolean;
  onExport: (formats: ExportFormat[], quality: QualityMode, cardsPerPage: CardsPerPage) => void;
  onCancel: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

/**
 * Dialog component for selecting batch export options.
 * 
 * This component allows users to:
 * - Select multiple export formats
 * - Configure quality settings
 * - Set cards per page for grid exports
 */
export function BatchExportDialog({
  isOpen,
  onExport,
  onCancel,
  t,
}: BatchExportDialogProps): React.JSX.Element | null {
  const [selectedFormats, setSelectedFormats] = useState<ExportFormat[]>([]);
  const [quality, setQuality] = useState<QualityMode>(QualityMode.BALANCED);
  const [cardsPerPage, setCardsPerPage] = useState<CardsPerPage>(2);

  if (!isOpen) return null;

  const handleFormatToggle = (format: ExportFormat): void => {
    setSelectedFormats((prev) =>
      prev.includes(format)
        ? prev.filter((f) => f !== format)
        : [...prev, format]
    );
  };

  const handleExport = (): void => {
    if (selectedFormats.length > 0) {
      onExport(selectedFormats, quality, cardsPerPage);
      // Reset selections
      setSelectedFormats([]);
      setQuality(QualityMode.BALANCED);
      setCardsPerPage(2);
    }
  };

  const formatLabels: Record<ExportFormat, string> = {
    [ExportFormat.PDF]: 'PDF',
    [ExportFormat.BINGO_CARDS]: '.bingoCards',
    [ExportFormat.PNG]: 'PNG (Individual Cards)',
    [ExportFormat.PNG_GRID]: 'PNG (Grid Layout)',
    [ExportFormat.CSV]: 'CSV (Data Only)',
    [ExportFormat.JSON]: 'JSON (Structured Data)',
  };

  const formatDescriptions: Record<ExportFormat, string> = {
    [ExportFormat.PDF]: 'Print-ready PDF document',
    [ExportFormat.BINGO_CARDS]: 'Backup format for re-import',
    [ExportFormat.PNG]: 'Individual card images (ZIP)',
    [ExportFormat.PNG_GRID]: 'All cards in one image',
    [ExportFormat.CSV]: 'Spreadsheet compatible format',
    [ExportFormat.JSON]: 'Machine-readable format',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>
          {t('batchExportTitle') || 'Batch Export Options'}
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>
            {t('selectFormats') || 'Select Export Formats:'}
          </h3>
          
          {Object.values(ExportFormat).map((format) => (
            <label
              key={format}
              style={{
                display: 'block',
                padding: '12px',
                marginBottom: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: selectedFormats.includes(format) ? '#e3f2fd' : 'white',
              }}
            >
              <input
                type="checkbox"
                checked={selectedFormats.includes(format)}
                onChange={() => handleFormatToggle(format)}
                style={{ marginRight: '8px' }}
              />
              <strong>{formatLabels[format]}</strong>
              <div style={{ marginLeft: '24px', fontSize: '14px', color: '#666' }}>
                {formatDescriptions[format]}
              </div>
            </label>
          ))}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label className="label-style">
            {t('quality') || 'Quality:'}
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as QualityMode)}
              className="input-style"
              style={{ marginTop: '4px' }}
            >
              <option value={QualityMode.FAST}>{t('qualityFast') || 'Fast'}</option>
              <option value={QualityMode.BALANCED}>{t('qualityBalanced') || 'Balanced'}</option>
              <option value={QualityMode.HIGH}>{t('qualityHigh') || 'High'}</option>
            </select>
          </label>
        </div>

        {selectedFormats.includes(ExportFormat.PNG_GRID) && (
          <div style={{ marginBottom: '20px' }}>
            <label className="label-style">
              {t('cardsPerRow') || 'Cards Per Row (Grid):'}
              <input
                type="number"
                min="1"
                max="5"
                value={cardsPerPage}
                onChange={(e) => setCardsPerPage(Number(e.target.value) as CardsPerPage)}
                className="input-style"
                style={{ marginTop: '4px' }}
              />
            </label>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            className="button-style"
            style={{ backgroundColor: '#757575' }}
          >
            {t('cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleExport}
            className="button-style"
            disabled={selectedFormats.length === 0}
            style={{
              opacity: selectedFormats.length === 0 ? 0.6 : 1,
              cursor: selectedFormats.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {t('exportSelected') || `Export ${selectedFormats.length} Format(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
