/// <reference lib="webworker" />

import { buildPdf } from "../utils/pdf/vectorPdf";
import { Card } from "../utils/bingo.interface";
import { CardTheme } from "../utils/bingo.interface";
import { CardsPerPage } from "../utils/types";

export type PdfWorkerRequest = {
  cards: Card[];
  header: string;
  footer: string;
  cardsPerPage: CardsPerPage;
  theme: CardTheme;
};

export type PdfWorkerResponse =
  | { type: "progress"; progress: number }
  | { type: "done"; blob: Blob }
  | { type: "error"; message: string }
  | { type: "cancelled" };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<PdfWorkerRequest | { type: "cancel" }>) => {
  const data = event.data as { type?: string };
  if (data && data.type === "cancel") {
    // best-effort: cannot interrupt sync build; ignore
    return;
  }
  const req = event.data as PdfWorkerRequest;
  try {
    const blob = buildPdf({
      cards: req.cards,
      header: req.header,
      footer: req.footer,
      cardsPerPage: req.cardsPerPage,
      theme: req.theme,
      onProgress: (percent) => {
        ctx.postMessage({ type: "progress", progress: percent } as PdfWorkerResponse);
      },
    });
    ctx.postMessage({ type: "done", blob } as PdfWorkerResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "__cancelled__") {
      ctx.postMessage({ type: "cancelled" } as PdfWorkerResponse);
    } else {
      ctx.postMessage({ type: "error", message } as PdfWorkerResponse);
    }
  }
};

export {};
