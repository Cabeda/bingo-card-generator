'use client';

import React from "react";
import { CardsPerPage, isValidCardsPerPage } from "../utils/types";

type QualityMode = 'fast' | 'balanced' | 'high';

interface ExportConfigurationProps {
  bingoPercard: CardsPerPage;
  setBingoPercard: (value: CardsPerPage) => void;
  qualityMode: QualityMode;
  setQualityMode: (value: QualityMode) => void;
  eventHeader: string;
  setEventHeader: (value: string) => void;
  locationFooter: string;
  setLocationFooter: (value: string) => void;
  t: (key: string) => string;
}

/**
 * ExportConfiguration component for the cards page.
 * 
 * This component is responsible for:
 * - Cards per page slider
 * - Quality mode selector
 * - Event name input
 * - Location input
 */
export function ExportConfiguration({
  bingoPercard,
  setBingoPercard,
  qualityMode,
  setQualityMode,
  eventHeader,
  setEventHeader,
  locationFooter,
  setLocationFooter,
  t,
}: ExportConfigurationProps): React.JSX.Element {
  return (
    <>
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
    </>
  );
}
