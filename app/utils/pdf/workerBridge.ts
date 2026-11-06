import { Game } from "../../utils/bingo.interface";
import { CardTheme } from "../../utils/bingo.interface";
import { CardsPerPage } from "../../utils/types";

export function runWorkerPdf(
  bingoCards: Game,
  eventHeader: string,
  locationFooter: string,
  bingoPercard: CardsPerPage,
  theme: CardTheme,
  onProgress: (p: number) => void,
  isCancelled: () => boolean,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("../../workers/pdf.worker.ts", import.meta.url));
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
      return;
    }
    const cancelInterval = setInterval(() => {
      if (isCancelled()) {
        worker.postMessage({ type: "cancel" });
      }
    }, 50);

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "progress") {
        onProgress(msg.progress);
      } else if (msg.type === "done") {
        clearInterval(cancelInterval);
        worker.terminate();
        resolve(msg.blob as Blob);
      } else if (msg.type === "cancelled") {
        clearInterval(cancelInterval);
        worker.terminate();
        reject(new Error("__cancelled__"));
      } else if (msg.type === "error") {
        clearInterval(cancelInterval);
        worker.terminate();
        reject(new Error(msg.message || "errorGeneratingPdf"));
      }
    };
    worker.onerror = () => {
      clearInterval(cancelInterval);
      worker.terminate();
      reject(new Error("worker_error"));
    };

    worker.postMessage({
      cards: bingoCards.cards,
      header: eventHeader,
      footer: locationFooter,
      cardsPerPage: bingoPercard,
      theme,
    });
  });
}
