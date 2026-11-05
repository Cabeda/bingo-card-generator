import { readFileSync } from "fs";
import {
  checkClaim,
  drawNextNumber,
  loadGameFile,
  saveGameFile,
} from "./gameFiles";

describe("saved bingo games", () => {
  it("opens the existing legacy backup without altering numbered cards", () => {
    const content = readFileSync("app/test.bingoCards", "utf8");
    const game = loadGameFile("Magusto.BINGOCARDS", content);
    expect(game.filename).toBe("Magusto");
    expect(game.cards).toHaveLength(200);
    expect(game.cards[0].numbers).toEqual([
      1,
      13,
      21,
      32,
      null,
      null,
      null,
      73,
      null,
      null,
      14,
      null,
      null,
      46,
      57,
      62,
      null,
      80,
      4,
      15,
      null,
      null,
      49,
      59,
      66,
      null,
      null,
    ]);
    expect(game.cards.every((c) => c.numbers.length === 27)).toBe(true);
    expect(
      loadGameFile("copy.bingoCards", saveGameFile(game)).cards.map(
        (c) => c.numbers,
      ),
    ).toEqual(game.cards.map((c) => c.numbers));
  });
  it("rejects malformed files and invalid card IDs", () => {
    for (const content of [
      "",
      "|CardNo.1;NaN",
      "|CardNo.abc;1",
      "|CardNo.1;91",
    ])
      expect(() => loadGameFile("bad.bingoCards", content)).toThrow();
    expect(() => loadGameFile("bad.txt", "")).toThrow();
  });
});

describe("90-ball rules", () => {
  it("includes 90 as the final possible call and stops when exhausted", () => {
    const called = Array.from({ length: 89 }, (_, i) => i + 1);
    expect(drawNextNumber(called)).toBe(90);
    expect(drawNextNumber([...called, 90])).toBeNull();
  });
  it("checks complete nine-cell rows, ignoring blanks", () => {
    const card = [
      1,
      null,
      21,
      31,
      null,
      51,
      null,
      71,
      null,
      2,
      12,
      null,
      null,
      42,
      null,
      62,
      null,
      82,
      null,
      13,
      23,
      33,
      null,
      53,
      null,
      73,
      null,
    ];
    expect(checkClaim(card, [1, 21, 31], "line")).toBe(false);
    expect(checkClaim(card, [1, 21, 31, 51, 71], "line")).toBe(true);
    expect(checkClaim(card, [1, 21, 31, 51, 71], "full")).toBe(false);
    expect(
      checkClaim(
        card,
        card.filter((n): n is number => n !== null),
        "full",
      ),
    ).toBe(true);
  });
});

it("rejects cards with fifteen numbers distributed incorrectly across rows", () => {
  const malformed = `|CardNo.1;${[1, null, null, null, null, null, null, null, null, 2, 3, 4, 5, 6, 7, 8, null, null, 9, 10, 11, 12, 13, 14, 15, null, null].map((n) => n ?? "").join(";")}`;
  expect(() => loadGameFile("bad.bingoCards", malformed)).toThrow();
});
