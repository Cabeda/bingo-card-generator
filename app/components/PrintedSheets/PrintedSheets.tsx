"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardTheme } from "../../utils/bingo.interface";
import { layoutFor, PRINT_PAGE, sheetsOf } from "./printLayout";
import "./printedSheets.css";

interface PrintedSheetsProps {
  cards: readonly Card[];
  eventName: string;
  cardsPerPage: number;
  theme: CardTheme;
  preview?: boolean;
}

/** The same numbered cards and physical measurements in preview and on paper. */
export function PrintedSheets({
  cards,
  eventName,
  cardsPerPage,
  theme,
  preview = false,
}: PrintedSheetsProps): React.JSX.Element | null {
  const t = useTranslations("event");
  const layout = layoutFor(cardsPerPage);
  const sheets = sheetsOf(cards, cardsPerPage);
  const style = {
    "--sheet-columns": layout.columns,
    "--sheet-rows": layout.rows,
    "--sheet-card-height": `${layout.cardHeightMm}em`,
    "--sheet-page-width": PRINT_PAGE.widthMm,
    "--sheet-page-height": PRINT_PAGE.heightMm,
    "--sheet-margin": `${PRINT_PAGE.marginMm}em`,
    "--sheet-gap": `${PRINT_PAGE.gapMm}em`,
    "--bingo-accent": theme.primaryColor,
    "--bingo-accent-text": theme.textColor,
    "--bingo-card-background": theme.backgroundColor,
    "--bingo-card-border": theme.secondaryColor,
    "--bingo-card-border-width": theme.borderWidth,
    "--bingo-card-padding": theme.cellPadding,
    "--bingo-card-radius": theme.borderRadius,
    "--bingo-card-font": theme.fontFamily,
  } as React.CSSProperties;
  const cardMarkup = (card: Card): React.JSX.Element => (
    <article className="bingo-flow-card" key={card.cardNumber}>
      <header>
        <b>{eventName}</b>
        <span>#{String(card.cardNumber).padStart(3, "0")}</span>
      </header>
      <div>
        {card.numbers.map((number, index) => (
          <span className={number === null ? "is-empty" : ""} key={index}>
            {number}
          </span>
        ))}
      </div>
      <footer>{t("cardFooter")}</footer>
    </article>
  );

  if (preview) {
    return (
      <div className="bingo-flow-sheet-frame" style={style}>
        <div className="bingo-flow-sheet-page">{sheets[0]?.map(cardMarkup)}</div>
      </div>
    );
  }
  if (!sheets.length) return null;

  return (
    <>
      <style>{`@media print {
        @page { size: ${PRINT_PAGE.widthMm}mm ${PRINT_PAGE.heightMm}mm; margin: ${PRINT_PAGE.marginMm}mm; }
      }`}</style>
      <div className="bingo-flow-print-only" aria-hidden="true" style={style}>
        {sheets.map((sheet, index) => (
          <section className="bingo-flow-print-sheet" key={index}>
            {sheet.map(cardMarkup)}
          </section>
        ))}
      </div>
    </>
  );
}
