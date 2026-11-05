import { loadGameFile } from "../../utils/gameFiles";
import { restoreSession } from "./session";

const game = loadGameFile(
  "Family.bingoCards",
  "|CardNo.7;1;;21;31;;51;;71;;2;12;;;42;;62;;82;;13;23;33;;53;;73;",
);
const valid = {
  game,
  drawn: [1, 90],
  paused: true,
  target: "full",
  stage: "host",
  started: true,
  cardsPerPage: 4,
};

describe("stored bingo sessions", () => {
  it("preserves cards, calls, pause, winning target and stage", () => {
    expect(restoreSession(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
  });
  it.each(
    [
      null,
      undefined,
      false,
      0,
      "game",
      [],
      {},
      { game: null },
      { game: { filename: 1, cards: [] } },
      { game: { filename: "x", cards: null } },
    ].map((value) => [value]),
  )("rejects missing or invalid game data %#", (value) => {
    expect(() => restoreSession(value)).toThrow();
  });
  it.each(
    [
      null,
      {},
      "1,90",
      [0],
      [91],
      [-1],
      [1.5],
      ["1"],
      [NaN],
      [Infinity],
      [1, 1],
    ].map((drawn) => [drawn]),
  )("rejects corrupt or duplicate call history %#", (drawn) => {
    expect(() => restoreSession({ ...valid, drawn })).toThrow();
  });
  it("accepts a fully exhausted 90-ball session", () => {
    const drawn = Array.from({ length: 90 }, (_, i) => i + 1);
    expect(restoreSession({ ...valid, drawn }).drawn).toEqual(drawn);
  });
  it("uses safe defaults for unknown optional settings", () => {
    const restored = restoreSession({
      ...valid,
      target: "unknown",
      stage: "unknown",
      paused: "yes",
      started: "yes",
    });
    expect(restored.target).toBe("line");
    expect(restored.stage).toBe("print");
    expect(restored.paused).toBe(false);
    expect(restored.started).toBe(false);
    expect(restored.cardsPerPage).toBe(4);
  });
  it("keeps a supported print layout and ignores unsupported ones", () => {
    expect(restoreSession({ ...valid, cardsPerPage: 3 }).cardsPerPage).toBe(3);
    expect(restoreSession({ ...valid, cardsPerPage: 8 }).cardsPerPage).toBe(4);
    expect(restoreSession({ ...valid, cardsPerPage: "8" }).cardsPerPage).toBe(
      4,
    );
  });
  it("rejects malformed card arrays even inside otherwise valid JSON", () => {
    for (const cards of [[], [null], [{}], [{ cardNumber: 7, numbers: [1] }]]) {
      expect(() =>
        restoreSession({ ...valid, game: { filename: "x", cards } }),
      ).toThrow();
    }
  });
});
