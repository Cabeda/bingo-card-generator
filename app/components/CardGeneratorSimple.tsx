'use client';

import React from "react";

interface CardGeneratorSimpleProps {
  numCards: number;
  setNumCards: (value: number) => void;
  onGenerateCards: () => void;
  isGenerating: boolean;
  t: (key: string) => string;
}

/**
 * Simplified CardGenerator component for the home page.
 * 
 * This component only shows:
 * - Number of cards input
 * - Generate button
 */
export function CardGeneratorSimple({
  numCards,
  setNumCards,
  onGenerateCards,
  isGenerating,
  t,
}: CardGeneratorSimpleProps): React.JSX.Element {
  return (
    <>
      <div className="margin-bottom-20">
        <label htmlFor="num-cards-input" className="label-style">{t('numCards')}</label>
        <input
          id="num-cards-input"
          type="number"
          value={numCards}
          onChange={(e) => setNumCards(parseInt(e.target.value, 10) || 1)}
          placeholder={t('numCardsPlaceholder')}
          min={1}
          className="input-style"
          aria-describedby="num-cards-description"
          aria-required="true"
        />
        <span id="num-cards-description" className="sr-only">
          Enter the number of bingo cards you want to generate
        </span>
      </div>
      <div className="margin-bottom-20">
        <button 
          onClick={onGenerateCards} 
          className="button-style"
          disabled={isGenerating}
          aria-disabled={isGenerating}
          aria-label={isGenerating ? "Generating cards, please wait" : "Generate bingo cards"}
          style={{
            opacity: isGenerating ? 0.6 : 1,
            cursor: isGenerating ? "not-allowed" : "pointer",
          }}
        >
          {t('generateCards')}
        </button>
      </div>
    </>
  );
}
