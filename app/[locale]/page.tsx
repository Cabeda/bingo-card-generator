// app/[locale]/page.tsx
'use client';

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "../routing";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { CardGeneratorSimple } from "../components/CardGeneratorSimple";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { generateRandomBingoCards, getCurrentDate } from "../utils/utils";
import { createGameId } from "../utils/types";
import { Game } from "../utils/bingo.interface";

export default function Home(): React.JSX.Element {
  const t = useTranslations('fileUpload');
  const router = useRouter();
  const [numCards, setNumCards] = useState<number>(10);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const eventHeader: string = `Magusto ${new Date().getFullYear()}`;

  const handleGenerateCards = (): void => {
    setIsGenerating(true);
    
    // Use setTimeout to allow UI to update before heavy operation
    setTimeout(() => {
      const generatedCards = generateRandomBingoCards(numCards);
      const game: Game = {
        filename: createGameId(`${getCurrentDate()}-${eventHeader}`),
        cards: generatedCards,
      };
      
      // Save to sessionStorage for the cards page
      sessionStorage.setItem('bingoGame', JSON.stringify(game));
      sessionStorage.setItem('numCards', numCards.toString());
      
      setIsGenerating(false);
      
      // Navigate to cards page
      router.push('/cards');
    }, 50);
  };

  return (
    <ErrorBoundary>
      <div className="container">
        <LoadingOverlay
          isVisible={isGenerating}
          message={t('generating')}
          showProgress={false}
        />
        
        <section className="file-upload" aria-labelledby="page-title">
          <h1 id="page-title">{t('title')}</h1>
          
          <CardGeneratorSimple
            numCards={numCards}
            setNumCards={setNumCards}
            onGenerateCards={handleGenerateCards}
            isGenerating={isGenerating}
            t={t}
          />
        </section>
      </div>
    </ErrorBoundary>
  );
}
