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

const validGrid = [
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
const record = (
  id = "1",
  grid: (number | string | null)[] = validGrid,
): string => `|CardNo.${id};${grid.map((n) => n ?? "").join(";")}`;

describe("backup boundary cases", () => {
  it.each(["0", "-1", "1.5", "01", "NaN", "Infinity", "9007199254740992"])(
    "rejects invalid card ID %s",
    (id) => {
      expect(() => loadGameFile("bad.bingoCards", record(id))).toThrow();
    },
  );
  it.each(["0", "91", "-1", "1.5", "1e1", "NaN", "Infinity", " 1", "1 "])(
    "rejects invalid grid token %s without partially loading",
    (token) => {
      const grid: (number | string | null)[] = [...validGrid];
      grid[0] = token;
      expect(() =>
        loadGameFile("bad.bingoCards", record("1") + record("2", grid)),
      ).toThrow();
    },
  );
  it.each([26, 28, 29])("rejects %s populated grid slots", (length) => {
    const grid = [...validGrid, 1, 2].slice(0, length);
    expect(() => loadGameFile("bad.bingoCards", record("1", grid))).toThrow();
  });
  it("rejects duplicate card IDs even when the grids are valid", () => {
    expect(() =>
      loadGameFile("duplicate.bingoCards", record() + record()),
    ).toThrow();
  });
  it("accepts BOM, CRLF at file boundaries, optional leading separator and legacy trailing separator", () => {
    const game = loadGameFile(
      "Family.BINGOCARDS",
      `\uFEFF\r\n${record().slice(1)};\r\n`,
    );
    expect(game.cards[0].numbers).toEqual(validGrid);
  });
  it("retains nonsequential IDs and repeated legacy cell values through export/import", () => {
    const repeated = [...validGrid];
    repeated[2] = 1;
    const game = loadGameFile(
      "original.bingoCards",
      record("7", repeated) + record("101"),
    );
    const copy = loadGameFile("copy.bingoCards", saveGameFile(game));
    expect(copy.cards.map((card) => card.cardNumber)).toEqual([7, 101]);
    expect(copy.cards[0].numbers).toEqual(repeated);
    expect(copy.cards[1].numbers).toEqual(validGrid);
  });
});

describe("draw exhaustion and randomness boundaries", () => {
  afterEach(() => jest.restoreAllMocks());
  it.each([0, 1 - Number.EPSILON, 0.5])(
    "completes a whole game with random source %s without repeats or out-of-range calls",
    (value) => {
      jest.spyOn(Math, "random").mockReturnValue(value);
      const calls: number[] = [];
      for (let i = 0; i < 90; i++) {
        const next = drawNextNumber(calls);
        expect(next).not.toBeNull();
        expect(calls).not.toContain(next);
        expect(next).toBeGreaterThanOrEqual(1);
        expect(next).toBeLessThanOrEqual(90);
        calls.push(next!);
      }
      expect(new Set(calls).size).toBe(90);
      expect(calls).toContain(1);
      expect(calls).toContain(90);
      expect(drawNextNumber(calls)).toBeNull();
      expect(drawNextNumber(calls)).toBeNull();
    },
  );
  it("does not mutate call history when selecting a number", () => {
    const calls = Object.freeze([1, 90]);
    drawNextNumber(calls as unknown as number[]);
    expect(calls).toEqual([1, 90]);
  });
  it("can draw the only remaining number at either range endpoint", () => {
    expect(drawNextNumber(Array.from({ length: 89 }, (_, i) => i + 2))).toBe(1);
    expect(drawNextNumber(Array.from({ length: 89 }, (_, i) => i + 1))).toBe(
      90,
    );
  });
});

describe("claim boundaries", () => {
  it.each([
    [1, 21, 31, 51, 71],
    [2, 12, 42, 62, 82],
    [13, 23, 33, 53, 73],
  ])(
    "recognizes a complete first, second or third row: %j",
    (...calls: number[]) => {
      expect(checkClaim(validGrid, calls, "line")).toBe(true);
      expect(checkClaim(validGrid, calls.slice(0, -1), "line")).toBe(false);
      expect(checkClaim(validGrid, calls, "full")).toBe(false);
    },
  );
  it("does not confuse a column, diagonal or mixed-row numbers with a line", () => {
    expect(checkClaim(validGrid, [1, 2, 13, 21, 42, 73], "line")).toBe(false);
  });
  it("requires the final numbered cell, including 90, for a full house", () => {
    const grid = [...validGrid];
    grid[25] = 90;
    const all = [1, 21, 31, 51, 71, 2, 12, 42, 62, 82, 13, 23, 33, 53, 90];
    expect(checkClaim(grid, all.slice(0, -1), "full")).toBe(false);
    expect(checkClaim(grid, all, "full")).toBe(true);
  });
  it.each(
    [[], Array(26).fill(null), Array(27).fill(null), Array(28).fill(null)].map(
      (grid) => [grid],
    ),
  )("never awards a claim to an empty or incorrectly sized card %#", (grid) => {
    expect(checkClaim(grid, [], "line")).toBe(false);
    expect(checkClaim(grid, [], "full")).toBe(false);
  });
  it("rejects a 27-cell card whose row contains only one numbered cell", () => {
    const invalid = Array(27).fill(null);
    invalid[0] = 1;
    expect(checkClaim(invalid, [1], "line")).toBe(false);
    expect(checkClaim(invalid, [1], "full")).toBe(false);
  });
  it("does not mutate cards or drawn numbers when checking a claim", () => {
    const grid = Object.freeze([...validGrid]),
      calls = Object.freeze([1, 21, 31, 51, 71]);
    expect(
      checkClaim(
        grid as unknown as (number | null)[],
        calls as unknown as number[],
        "line",
      ),
    ).toBe(true);
    expect(grid).toEqual(validGrid);
    expect(calls).toEqual([1, 21, 31, 51, 71]);
  });
});

it.each([0, 91, -1, 1.5, NaN, Infinity])(
  "refuses claims containing invalid numbered cells: %s",
  (value) => {
    const grid = [...validGrid];
    grid[0] = value;
    expect(
      checkClaim(
        grid,
        [...validGrid.filter((n): n is number => n !== null), value],
        "line",
      ),
    ).toBe(false);
    expect(
      checkClaim(
        grid,
        [...validGrid.filter((n): n is number => n !== null), value],
        "full",
      ),
    ).toBe(false);
  },
);
