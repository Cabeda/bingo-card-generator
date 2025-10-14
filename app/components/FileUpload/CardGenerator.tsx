'use client';

import React from "react";
import { CardsPerPage, isValidCardsPerPage } from "../../utils/types";

type QualityMode = 'fast' | 'balanced' | 'high';

interface CardGeneratorProps {
  numCards: number;
  setNumCards: (value: number) => void;
  bingoPercard: CardsPerPage;
  setBingoPercard: (value: CardsPerPage) => void;
  qualityMode: QualityMode;
  setQualityMode: (value: QualityMode) => void;
  eventHeader: string;
  setEventHeader: (value: string) => void;
  locationFooter: string;
  setLocationFooter: (value: string) => void;
  onGenerateCards: () => void;
  isGenerating: boolean;
  isGeneratingPDF: boolean;
  t: (key: string) => string;
}

/**
 * CardGenerator component for card generation controls.
 * 
 * This component is responsible for:
 * - Number of cards input
 * - Cards per page slider
 * - Quality mode selector
 * - Event name input
 * - Location input
 * - Generate cards button
 * - Loading state display
 */
export function CardGenerator({
  numCards,
  setNumCards,
  bingoPercard,
  setBingoPercard,
  qualityMode,
  setQualityMode,
  eventHeader,
  setEventHeader,
  locationFooter,
  setLocationFooter,
  onGenerateCards,
  isGenerating,
  isGeneratingPDF,
  t,
}: CardGeneratorProps): React.JSX.Element {
  return (
    <>
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
      <div className="margin-bottom-20">
        <button 
          onClick={onGenerateCards} 
          className="button-style"
          disabled={isGenerating || isGeneratingPDF}
          style={{
            opacity: (isGenerating || isGeneratingPDF) ? 0.6 : 1,
            cursor: (isGenerating || isGeneratingPDF) ? "not-allowed" : "pointer",
          }}
        >
          {t('generateCards')}
        </button>
      </div>
    </>
  );
}
