'use client';

import React from "react";
import { Card } from "../../utils/bingo.interface";

interface CardDisplayProps {
  card: Card;
  cardRef: (el: HTMLDivElement | null) => void;
  cardNumber: string;
}

/**
 * CardDisplay component for rendering a single bingo card.
 * 
 * This component is responsible for displaying:
 * - A grid of bingo numbers (3x9 grid with 27 cells)
 * - Empty cells where appropriate
 * - Card number at the bottom
 * 
 * @param card - The card object containing numbers
 * @param cardRef - Ref callback for DOM element (used for PDF generation)
 * @param cardNumber - Display string for card identification
 */
export function CardDisplay({ card, cardRef, cardNumber }: CardDisplayProps): React.JSX.Element {
  return (
    <div
      className="bingo-card"
      ref={cardRef}
    >
      <div className="grid-container">
        {card.numbers.map((num, idx) => (
          <div
            key={idx}
            className={`bingo-cell ${num === null ? "empty" : ""}`}
          >
            {num !== null ? num : ""}
          </div>
        ))}
      </div>
      <p className="cardNumber">
        {cardNumber}
      </p>
    </div>
  );
}
