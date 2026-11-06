import { Game } from "../../utils/bingo.interface";
import {
  loadGameFile,
  saveGameFile,
  WinningTarget,
} from "../../utils/gameFiles";
import {
  DEFAULT_CARDS_PER_PAGE,
  normalizeCardsPerPage,
} from "../PrintedSheets/printLayout";

import { normalizePrintOptions, PrintOptions } from "../PrintedSheets/printOptions";

export type EventStage = "generate" | "print" | "host";
export interface EventSession {
  game: Game | null;
  drawn: number[];
  paused: boolean;
  target: WinningTarget;
  stage: EventStage;
  started: boolean;
  cardsPerPage: number;
  libraryId?: string | null;
  printOptions?: PrintOptions;
}
export const emptySession: EventSession = {
  game: null,
  drawn: [],
  paused: false,
  target: "line",
  stage: "generate",
  started: false,
  cardsPerPage: DEFAULT_CARDS_PER_PAGE,
};
export const SESSION_KEY = "bingoEventSession.v1";

/** Validate stored state just as strictly as an uploaded game file. */
export function restoreSession(value: unknown): EventSession {
  if (!value || typeof value !== "object") throw new Error("Invalid session");
  const candidate = value as EventSession;
  if (
    !candidate.game ||
    typeof candidate.game.filename !== "string" ||
    !Array.isArray(candidate.game.cards)
  )
    throw new Error("Invalid game");
  const game = loadGameFile(
    `${candidate.game.filename}.bingoCards`,
    saveGameFile(candidate.game),
  );
  if (
    !Array.isArray(candidate.drawn) ||
    candidate.drawn.some((n) => !Number.isInteger(n) || n < 1 || n > 90) ||
    new Set(candidate.drawn).size !== candidate.drawn.length
  )
    throw new Error("Invalid calls");
  return {
    game,
    drawn: candidate.drawn,
    paused: candidate.paused === true,
    target: candidate.target === "full" ? "full" : "line",
    stage: ["generate", "print", "host"].includes(candidate.stage)
      ? candidate.stage
      : "print",
    started: candidate.started === true,
    cardsPerPage: normalizeCardsPerPage(candidate.cardsPerPage),
    ...(candidate.libraryId !== undefined ? { libraryId: typeof candidate.libraryId === "string" && candidate.libraryId.trim() && candidate.libraryId.length <= 100 ? candidate.libraryId : null } : {}),
    ...(candidate.printOptions !== undefined ? { printOptions: normalizePrintOptions(candidate.printOptions) } : {}),
  };
}
