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
    <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend className="sr-only">Card Generation Settings</legend>
      
      <div className="margin-bottom-20">
        <label htmlFor="num-cards-input" className="label-style">{t('numCards')}</label>
        <input
          id="num-cards-input"
          type="number"
          value={numCards}
          onChange={(e) => setNumCards(parseInt(e.target.value, 10))}
          placeholder={t('numCardsPlaceholder')}
          min={1}
          className="input-style"
          aria-describedby="num-cards-help"
          aria-required="true"
        />
        <span id="num-cards-help" className="sr-only">
          Enter the number of bingo cards to generate (minimum 1)
        </span>
      </div>
      
      <div className="margin-bottom-20">
        <label htmlFor="cards-per-page-input" className="label-style">
          {t('cardsPerPage')}
        </label>
        <input
          id="cards-per-page-input"
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
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={bingoPercard}
          aria-valuetext={`${bingoPercard} cards per page`}
          aria-label="Select number of cards per page"
        />
        <span aria-live="polite" aria-atomic="true">{bingoPercard}</span>
      </div>
      
      <div className="margin-bottom-20">
        <label htmlFor="quality-mode-select" className="label-style">
          {t('qualityMode')}
        </label>
        <select
          id="quality-mode-select"
          value={qualityMode}
          onChange={(e) => setQualityMode(e.target.value as QualityMode)}
          className="input-style"
          style={{ width: '100%' }}
          aria-describedby="quality-mode-help"
        >
          <option value="fast">{t('qualityFast')}</option>
          <option value="balanced">{t('qualityBalanced')}</option>
          <option value="high">{t('qualityHigh')}</option>
        </select>
        <span id="quality-mode-help" className="sr-only">
          Choose the quality mode for PDF generation. Higher quality takes longer.
        </span>
      </div>
      
      <div className="margin-bottom-20">
        <label htmlFor="event-name-input" className="label-style">
          {t('eventName')}
        </label>
        <input
          id="event-name-input"
          type="text"
          value={eventHeader}
          onChange={(e) => setEventHeader(e.target.value)}
          placeholder={t('eventNamePlaceholder')}
          className="input-style"
          aria-label="Enter event name for the bingo cards"
        />
      </div>
      
      <div className="margin-bottom-20">
        <label htmlFor="location-input" className="label-style">
          {t('location')}
        </label>
        <input
          id="location-input"
          type="text"
          value={locationFooter}
          onChange={(e) => setLocationFooter(e.target.value)}
          placeholder={t('locationPlaceholder')}
          className="input-style"
          aria-label="Enter location for the bingo event"
        />
      </div>
      
      <div className="margin-bottom-20">
        <button 
          onClick={onGenerateCards} 
          className="button-style"
          disabled={isGenerating || isGeneratingPDF}
          aria-disabled={isGenerating || isGeneratingPDF}
          aria-label={
            isGenerating 
              ? "Generating cards, please wait" 
              : isGeneratingPDF 
              ? "PDF generation in progress, please wait"
              : "Generate bingo cards"
          }
          style={{
            opacity: (isGenerating || isGeneratingPDF) ? 0.6 : 1,
            cursor: (isGenerating || isGeneratingPDF) ? "not-allowed" : "pointer",
          }}
        >
          {t('generateCards')}
        </button>
      </div>
    </fieldset>
  );
}
