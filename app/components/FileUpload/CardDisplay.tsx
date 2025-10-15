'use client';

import React from "react";
import { Card, CardTheme } from "../../utils/bingo.interface";

interface CardDisplayProps {
  card: Card;
  cardRef: (el: HTMLDivElement | null) => void;
  cardNumber: string;
  theme?: CardTheme;
}

/**
 * CardDisplay component for rendering a single bingo card.
 * 
 * This component is responsible for displaying:
 * - A grid of bingo numbers (3x9 grid with 27 cells)
 * - Empty cells where appropriate
 * - Card number at the bottom
 * - Customizable theme styling
 * 
 * @param card - The card object containing numbers
 * @param cardRef - Ref callback for DOM element (used for PDF generation)
 * @param cardNumber - Display string for card identification
 * @param theme - Optional theme configuration for styling
 */
export function CardDisplay({ card, cardRef, cardNumber, theme }: CardDisplayProps): React.JSX.Element {
  const cellStyle = theme ? {
    backgroundColor: theme.primaryColor,
    color: theme.textColor,
    border: `${theme.borderWidth} solid ${theme.secondaryColor}`,
    borderRadius: theme.borderRadius,
    fontFamily: theme.fontFamily,
    padding: theme.cellPadding,
  } : {};

  const emptyCellStyle = theme ? {
    backgroundColor: theme.backgroundColor,
    border: `${theme.borderWidth} solid ${theme.secondaryColor}`,
    borderRadius: theme.borderRadius,
    padding: theme.cellPadding,
  } : {};

  const cardStyle = theme ? {
    border: `${theme.borderWidth} solid ${theme.secondaryColor}`,
    borderRadius: theme.borderRadius,
    fontFamily: theme.fontFamily,
  } : {};

  return (
    <div
      className="bingo-card"
      ref={cardRef}
      style={cardStyle}
    >
      <div className="grid-container">
        {card.numbers.map((num, idx) => (
          <div
            key={idx}
            className={`bingo-cell ${num === null ? "empty" : ""}`}
            style={num === null ? emptyCellStyle : cellStyle}
          >
            {num !== null ? num : ""}
          </div>
        ))}
      </div>
      <p className="cardNumber" style={theme ? { fontFamily: theme.fontFamily } : {}}>
        {cardNumber}
      </p>
    </div>
  );
}
