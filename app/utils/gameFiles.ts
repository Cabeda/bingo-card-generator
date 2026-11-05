import { Card, Game } from "./bingo.interface";
import { createCardId, createGameId } from "./types";

/** Decode both current exports and legacy exports with a trailing semicolon. */
export function loadGameFile(filename: string, content: string): Game {
  if (!/\.bingocards$/i.test(filename))
    throw new Error("Invalid game file extension");
  const name = filename.replace(/\.bingocards$/i, "");
  const cards: Card[] = content
    .trim()
    .split("|")
    .filter(Boolean)
    .map((record) => {
      const [id, ...cells] = record.split(";");
      if (!/^CardNo\.[1-9]\d*$/.test(id))
        throw new Error("Invalid card number");
      if (cells.length === 28 && cells[27] === "") cells.pop();
      if (
        cells.length !== 27 ||
        cells.some((n) => n !== "" && !/^\d+$/.test(n))
      )
        throw new Error("Invalid card grid");
      const numbers = cells.map((n) => (n === "" ? null : Number(n)));
      if (
        [0, 9, 18].some(
          (start) =>
            numbers.slice(start, start + 9).filter((n) => n !== null).length !==
            5,
        ) ||
        numbers.some((n) => n !== null && (n < 1 || n > 90))
      )
        throw new Error("Invalid card numbers");
      // Preserve repeated numbers in legacy files: printed cards must never be rewritten.
      const cardNumber = Number(id.slice(7));
      if (!Number.isSafeInteger(cardNumber))
        throw new Error("Invalid card number");
      return {
        cardTitle: createCardId(`${name}-${cardNumber}`),
        cardNumber,
        numbers,
      };
    });
  if (
    !cards.length ||
    new Set(cards.map((card) => card.cardNumber)).size !== cards.length
  )
    throw new Error("Empty game or duplicate card IDs");
  return { filename: createGameId(name), cards };
}

export function saveGameFile(game: Game): string {
  return game.cards
    .map(
      (card) =>
        `|CardNo.${card.cardNumber};${card.numbers.map((n) => n ?? "").join(";")}`,
    )
    .join("");
}

export type WinningTarget = "line" | "full";

export function drawNextNumber(called: number[]): number | null {
  const available = Array.from({ length: 90 }, (_, i) => i + 1).filter(
    (n) => !called.includes(n),
  );
  return available.length
    ? available[Math.floor(Math.random() * available.length)]
    : null;
}

export function checkClaim(
  numbers: (number | null)[],
  called: number[],
  target: WinningTarget,
): boolean {
  if (numbers.length !== 27) return false;
  const complete = (row: (number | null)[]) =>
    row.some((n) => n !== null) &&
    row.every((n) => n === null || called.includes(n));
  return target === "full"
    ? complete(numbers)
    : [0, 9, 18].some((start) => complete(numbers.slice(start, start + 9)));
}
