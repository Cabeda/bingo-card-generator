import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import messages from "../../../messages/en.json";
import { ThemeProvider } from "../ThemeProvider";
import { loadGameFile } from "../../utils/gameFiles";
import * as cardGeneration from "../../utils/shareGame";
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
Object.assign(globalThis, { TextEncoder, TextDecoder });
import { EventWorkspace } from "./EventWorkspace";
import * as library from "./gameLibrary";
import { PRESET_THEMES } from "../../utils/themes";
import { DEFAULT_PRINT_OPTIONS } from "../PrintedSheets/printOptions";
import { emptySession } from "./session";

jest.mock("./gameLibrary", () => ({ listLocalGames: jest.fn(), saveLocalGame: jest.fn(), loadLocalGame: jest.fn(), removeLocalGame: jest.fn() }));
const mockSavedRecords = new Map<string, library.SavedGame>();

let mockLocale = "en";
jest.mock("next-intl", () => ({
  useLocale: () => mockLocale,
  useTranslations:
    (namespace = "event") => (key: string, values?: Record<string, string | number>) => {
      let text =
        (messages as unknown as Record<string, Record<string, string>>)[namespace]?.[
          key
        ] || key;
      for (const [k, v] of Object.entries(values || {}))
        text = text.replaceAll(`{${k}}`, String(v));
      return text;
    },
}));
jest.mock("../LanguageSelector", () => ({
  LanguageSelector: () => <span>Language</span>,
}));
jest.mock("../ThemeSelector", () => ({
  ThemeSelector: () => <span>Custom themes</span>,
}));
async function renderEvent() {
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(<ThemeProvider><EventWorkspace /></ThemeProvider>);
  });
  return view;
}
beforeEach(() => {
  mockLocale = "en";
  window.history.replaceState(null, "", "/");
  localStorage.clear();
  sessionStorage.clear();
  mockSavedRecords.clear();
  jest.mocked(library.listLocalGames).mockReset().mockImplementation(async () => ({ games: [...mockSavedRecords.values()].map(record => ({ id: record.id, name: record.session.game!.filename, cardCount: record.session.game!.cards.length, calledCount: record.session.drawn.length, started: record.session.started, updatedAt: record.updatedAt })), unreadable: 0 }));
  jest.mocked(library.saveLocalGame).mockReset().mockImplementation(async (id, session, themeKey, theme, updatedAt = Date.now()) => {
    mockSavedRecords.set(id, JSON.parse(JSON.stringify({ id, session, themeKey, theme, updatedAt })));
    return { id, name: session.game!.filename, cardCount: session.game!.cards.length, calledCount: session.drawn.length, started: session.started, updatedAt };
  });
  jest.mocked(library.loadLocalGame).mockReset().mockImplementation(async id => {
    const record = mockSavedRecords.get(id);
    if (!record) throw new Error("Missing saved game");
    return record;
  });
  jest.mocked(library.removeLocalGame).mockReset().mockImplementation(async id => { mockSavedRecords.delete(id); });
});
const nativeProperties = [
  [window, "AudioContext"],
  [window, "speechSynthesis"],
  [window, "SpeechSynthesisUtterance"],
  [document, "fullscreenElement"],
  [document, "exitFullscreen"],
  [document.documentElement, "requestFullscreen"],
  [URL, "createObjectURL"],
  [URL, "revokeObjectURL"],
].map(([owner, key]) => ({
  owner: owner as object,
  key: key as string,
  descriptor: Object.getOwnPropertyDescriptor(owner, key as string),
}));
afterEach(() => {
  jest.restoreAllMocks();
  for (const { owner, key, descriptor } of nativeProperties) {
    if (descriptor) Object.defineProperty(owner, key, descriptor);
    else Reflect.deleteProperty(owner, key);
  }
});
// jsdom lacks native dialog methods; emulate the browser boundary, not game logic.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});
async function returnToSetup() {
  await act(async () => { fireEvent.click(await screen.findByRole("button", { name: "Back to cards" })); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Edit game" })); });
}
it("generates, previews and hosts the same cards, preserving calls when returning to print", async () => {
  await renderEvent();
  await act(async () => { fireEvent.change(await screen.findByLabelText("Event name"), {
    target: { value: "Family night" },
  }); });
  await act(async () => { fireEvent.change(await screen.findByLabelText("Number of cards"), {
    target: { value: "4" },
  }); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Generate game →" })); });
  expect(
    await screen.findByRole("heading", { name: "Your cards are ready." }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole("main")).getByText("#001"),
  ).toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Host this game →" })); });
  expect(
    await screen.findByText("Ready for the first call"),
  ).toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Draw first number →" })); });
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Back to cards" })); });
  await act(async () => { fireEvent.click(
    screen.getByRole("button", { name: "Return to your game →" }),
  ); });
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem("bingoEventSession.v1")!).drawn,
    ).toHaveLength(1),
  );
});

it("changes how many cards share a sheet without splitting card content", async () => {
  await renderEvent();
  await act(async () => { fireEvent.change(await screen.findByLabelText("Event name"), {
    target: { value: "Office party" },
  }); });
  await act(async () => { fireEvent.change(await screen.findByLabelText("Number of cards"), {
    target: { value: "9" },
  }); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Generate game →" })); });
  await screen.findByRole("heading", { name: "Your cards are ready." });

  const printed = (): Element =>
    document.querySelector(".bingo-flow-print-only")!;
  expect(printed().querySelectorAll(".bingo-flow-print-sheet")).toHaveLength(3);
  expect(screen.getByText("4 per sheet · 3 A4 sheets")).toBeInTheDocument();

  await act(async () => { fireEvent.click(screen.getByRole("radio", { name: "2" })); });
  expect(printed().querySelectorAll(".bingo-flow-print-sheet")).toHaveLength(5);
  expect(screen.getByText("2 per sheet · 5 A4 sheets")).toBeInTheDocument();
  expect(printed().querySelectorAll(".bingo-flow-card")).toHaveLength(9);
  expect(
    within(screen.getByRole("main")).getByText("Sheet 1 of 5"),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem("bingoEventSession.v1")!).cardsPerPage,
    ).toBe(2),
  );

  await act(async () => { fireEvent.click(screen.getByRole("radio", { name: "1" })); });
  expect(printed().querySelectorAll(".bingo-flow-print-sheet")).toHaveLength(9);
  expect(screen.getByText("1 per sheet · 9 A4 sheets")).toBeInTheDocument();
});

it("opens a legacy backup straight into hosting without generation or printing", async () => {
  const { readFileSync } = await import("fs");
  await renderEvent();
  await act(async () => { fireEvent.click(
    await screen.findByRole("button", { name: "Host a saved game" }),
  ); });
  expect(
    screen.queryByRole("button", { name: "Generate game →" }),
  ).not.toBeInTheDocument();
  const file = new File(["legacy backup"], "Family night.BINGOCARDS", {
    type: "text/plain",
  });
  Object.defineProperty(file, "text", {
    value: async () => readFileSync("app/test.bingoCards", "utf8"),
  });
  await act(async () => { fireEvent.change(screen.getByLabelText("Open saved bingo game"), {
    target: { files: [file] },
  }); });
  expect(
    await screen.findByRole("heading", { name: "Family night" }),
  ).toBeInTheDocument();
  expect(screen.getByText("90-ball bingo · 200 cards")).toBeInTheDocument();
  expect(screen.getByText("Ready for the first call")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Draw first number →" }),
  ).toBeEnabled();
});

it("restores the game and calls after refresh and keeps them when an invalid file is selected", async () => {
  const view = await renderEvent();
  await act(async () => { fireEvent.change(await screen.findByLabelText("Event name"), {
    target: { value: "Sunday bingo" },
  }); });
  await act(async () => { fireEvent.change(screen.getByLabelText("Number of cards"), {
    target: { value: "2" },
  }); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Generate game →" })); });
  await screen.findByRole("heading", { name: "Your cards are ready." });
  await act(async () => { fireEvent.click(
    await screen.findByRole("button", { name: "Host this game →" }),
  ); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Draw first number →" })); });
  await screen.findByText("Call 1 of 90");
  view.unmount();
  await renderEvent();
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
  await returnToSetup();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Host a saved game" })); });
  const invalid = new File(["bad"], "broken.bingoCards");
  Object.defineProperty(invalid, "text", { value: async () => "not a game" });
  await act(async () => { fireEvent.change(screen.getByLabelText("Open saved bingo game"), {
    target: { files: [invalid] },
  }); });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Your current game has been kept",
  );
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /3.*Host game/ })); });
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Sunday bingo" }),
  ).toBeInTheDocument();
});

const savedCard =
  "|CardNo.7;1;;21;31;;51;;71;;2;12;;;42;;62;;82;;13;23;33;;53;;73;";
function seedHost(drawn: number[] = [], target = "line"): void {
  localStorage.setItem(
    "bingoEventSession.v1",
    JSON.stringify({
      game: loadGameFile("Family.bingoCards", savedCard),
      drawn,
      paused: false,
      target,
      stage: "host",
      started: true,
    }),
  );
}
function selectFile(name: string, contents: string, size?: number): File {
  const file = new File([contents], name);
  Object.defineProperty(file, "text", { value: async () => contents });
  if (size !== undefined) Object.defineProperty(file, "size", { value: size });
  fireEvent.change(screen.getByLabelText("Open saved bingo game"), {
    target: { files: [file] },
  });
  return file;
}

it("cannot draw while paused, and resumes without dropping the last call", async () => {
  seedHost([1]);
  await renderEvent();
  await act(async () => { fireEvent.click(await screen.findByRole("button", { name: "Pause" })); });
  const draw = screen.getByRole("button", { name: "Draw next number →" });
  expect(draw).toBeDisabled();
  await act(async () => { fireEvent.click(draw); });
  await act(async () => { fireEvent.keyDown(document.body, { key: " " }); });
  expect(screen.getByText("Call 1 of 90")).toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Resume" })); });
  await act(async () => { fireEvent.click(draw); });
  expect(await screen.findByText("Call 2 of 90")).toBeInTheDocument();
});
it("draws exactly once per keyboard action and ignores form input, repeats and unrelated keys", async () => {
  seedHost();
  await renderEvent();
  await screen.findByText("Ready for the first call");
  await act(async () => { fireEvent.keyDown(document.body, { key: " " }); });
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
  await act(async () => { fireEvent.keyDown(document.body, { key: " ", repeat: true }); });
  await act(async () => { fireEvent.keyDown(document.body, { key: "a" }); });
  await act(async () => { fireEvent.keyDown(screen.getByLabelText("Check a player’s claim"), {
    key: "Enter",
  }); });
  expect(screen.getByText("Call 1 of 90")).toBeInTheDocument();
  await act(async () => { fireEvent.keyDown(document.body, { key: "Enter" }); });
  expect(await screen.findByText("Call 2 of 90")).toBeInTheDocument();
});
it("does not intercept Space or Enter before hosting", async () => {
  await renderEvent();
  await screen.findByLabelText("Event name");
  expect(
    fireEvent.keyDown(document.body, { key: "Enter", cancelable: true }),
  ).toBe(true);
  expect(fireEvent.keyDown(document.body, { key: " ", cancelable: true })).toBe(
    true,
  );
});
it("handles window-targeted keyboard events without throwing", async () => {
  seedHost();
  await renderEvent();
  await screen.findByText("Ready for the first call");
  await act(async () => { fireEvent.keyDown(window, { key: "Enter" }); });
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
});
it("stops at the final ball, including 90, and cannot draw a 91st call", async () => {
  seedHost(Array.from({ length: 89 }, (_, i) => i + 1));
  await renderEvent();
  await act(async () => { fireEvent.click(
    await screen.findByRole("button", { name: "Draw next number →" }),
  ); });
  expect(await screen.findByText("Call 90 of 90")).toBeInTheDocument();
  expect(screen.getByText("All numbers called")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Draw next number →" }),
  ).toBeDisabled();
  await act(async () => { fireEvent.keyDown(document.body, { key: "Enter" }); });
  expect(screen.getByText("Call 90 of 90")).toBeInTheDocument();
});
it("removes host actions and keyboard draws from audience view", async () => {
  seedHost([1]);
  await renderEvent();
  await act(async () => { fireEvent.click(
    await screen.findByRole("button", { name: "Audience view ↗" }),
  ); });
  expect(
    screen.queryByRole("button", { name: "Draw next number →" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByLabelText("Check a player’s claim"),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Back to cards" })).not.toBeInTheDocument();
  expect(screen.getAllByLabelText(/^\d+, /)).toHaveLength(90);
  await act(async () => { fireEvent.keyDown(document.body, { key: " " }); });
  expect(screen.getByText("Call 1 of 90")).toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Return to host" })); });
  expect(
    screen.getByRole("button", { name: "Draw next number →" }),
  ).toBeEnabled();
});
it.each([
  ["line", [1, 21, 31, 51, 71], "7", "We have a winner!"],
  ["line", [1, 21, 31, 51], "7", "Not quite yet"],
  ["full", [1, 21, 31, 51, 71], "7", "Not quite yet"],
  [
    "full",
    [1, 21, 31, 51, 71, 2, 12, 42, 62, 82, 13, 23, 33, 53, 73],
    "7",
    "We have a winner!",
  ],
  ["line", [1], "999", "Card not found"],
] as const)(
  "checks %s claims using the selected target and keeps play paused: %#",
  async (target, drawn, card, expected) => {
    seedHost([...drawn], target);
    await renderEvent();
    await act(async () => { fireEvent.change(await screen.findByLabelText("Check a player’s claim"), {
      target: { value: card },
    }); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Check card" })); });
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: expected }),
    ).toBeInTheDocument();
    await act(async () => { fireEvent.keyDown(document.body, { key: " " }); });
    expect(screen.getByText(`Call ${drawn.length} of 90`)).toBeInTheDocument();
    await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Close" })); });
    expect(
      screen.getByRole("button", { name: "Draw next number →" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Resume" })).toBeEnabled();
  },
);
it.each([false, true])(
  "restart requires confirmation (%s) and preserves the card set",
  async (confirmed) => {
    seedHost([1, 90]);
    await renderEvent();
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(confirmed);
    await act(async () => { fireEvent.click(await screen.findByText("Settings")); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Restart draws" })); });
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(confirmed ? "Ready for the first call" : "Call 2 of 90"),
    ).toBeInTheDocument();
    expect(screen.getByText("90-ball bingo · 1 cards")).toBeInTheDocument();
  },
);
it.each([false, true])(
  "replacing a loaded game requires confirmation (%s)",
  async (confirmed) => {
    seedHost([1, 90]);
    await renderEvent();
    await returnToSetup();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Host a saved game" })); });
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(confirmed);
    await act(async () => { selectFile("Replacement.bingoCards", savedCard); });
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    if (confirmed) {
      expect(
        await screen.findByRole("heading", { name: "Replacement" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Ready for the first call")).toBeInTheDocument();
    } else {
      await act(async () => { fireEvent.click(screen.getByRole("button", { name: /3.*Host game/ })); });
      expect(
        await screen.findByRole("heading", { name: "Family" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Call 2 of 90")).toBeInTheDocument();
    }
  },
);
it.each(["broken JSON", "null", "{}", '{"game":null}'])(
  "recovers gracefully from corrupt stored data %s",
  async (stored) => {
    localStorage.setItem("bingoEventSession.v1", stored);
    await renderEvent();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "could not be restored",
    );
    expect(
      screen.getByRole("button", { name: "Host a saved game" }),
    ).toBeEnabled();
  },
);
it("keeps gameplay usable when browser storage is full", async () => {
  seedHost();
  const originalSet = Storage.prototype.setItem;
  const set = jest
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === "bingoEventSession.v1") throw new Error("QuotaExceededError");
      originalSet.call(this, key, value);
    });
  await renderEvent();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "cannot save this session",
  );
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Draw first number →" })); });
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
  expect(set).toHaveBeenCalled();
});
it("rejects an oversized backup before reading it", async () => {
  await renderEvent();
  await act(async () => { fireEvent.click(
    await screen.findByRole("button", { name: "Host a saved game" }),
  ); });
  const file = new File(["x"], "huge.bingoCards");
  const read = jest.fn().mockResolvedValue(savedCard);
  Object.defineProperty(file, "text", { value: read });
  Object.defineProperty(file, "size", { value: 10 * 1024 * 1024 + 1 });
  await act(async () => { fireEvent.change(screen.getByLabelText("Open saved bingo game"), {
    target: { files: [file] },
  }); });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to open this file",
  );
  expect(read).not.toHaveBeenCalled();
});
it("handles read failures without leaving the file button disabled", async () => {
  await renderEvent();
  await act(async () => { fireEvent.click(
    await screen.findByRole("button", { name: "Host a saved game" }),
  ); });
  const file = new File(["x"], "unreadable.bingoCards");
  Object.defineProperty(file, "text", {
    value: async () => {
      throw new Error("Read failure");
    },
  });
  await act(async () => { fireEvent.change(screen.getByLabelText("Open saved bingo game"), {
    target: { files: [file] },
  }); });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to open this file",
  );
  expect(
    screen.getByRole("button", { name: "Open game file → Host" }),
  ).toBeEnabled();
});

it("does not clear or replace a game when the file chooser is cancelled", async () => {
  seedHost([1]);
  await renderEvent();
  await returnToSetup();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Host a saved game" })); });
  await act(async () => { fireEvent.change(screen.getByLabelText("Open saved bingo game"), {
    target: { files: [] },
  }); });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /3.*Host game/ })); });
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
});
it.each([0, -1, 1.5, 1001])(
  "rejects a generation request with %s cards",
  async (count) => {
    await renderEvent();
    await act(async () => { fireEvent.change(await screen.findByLabelText("Event name"), {
      target: { value: "Family" },
    }); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Number of cards"), {
      target: { value: String(count) },
    }); });
    await act(async () => { fireEvent.submit(screen.getByLabelText("Event name").closest("form")!); });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "between 1 and 1,000 cards",
    );
    expect(screen.getByRole("button", { name: /3.*Host game/ })).toBeDisabled();
  },
);
it("rejects a blank event name and generates a valid one-card game", async () => {
  await renderEvent();
  const name = await screen.findByLabelText("Event name");
  await act(async () => { fireEvent.change(name, { target: { value: "   " } }); });
  await act(async () => { fireEvent.submit(name.closest("form")!); });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Enter an event name",
  );
  await act(async () => { fireEvent.change(name, { target: { value: " One player " } }); });
  await act(async () => { fireEvent.change(screen.getByLabelText("Number of cards"), {
    target: { value: "1" },
  }); });
  await act(async () => { fireEvent.submit(name.closest("form")!); });
  expect(
    await screen.findByRole("heading", { name: "Your cards are ready." }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole("main")).getByText("#001"),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole("main")).queryByText("#002"),
  ).not.toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Host this game →" })); });
  expect(
    await screen.findByRole("heading", { name: "One player" }),
  ).toBeInTheDocument();
});
it("changes the winning target without altering the current draw history", async () => {
  seedHost([1, 21, 31, 51, 71]);
  await renderEvent();
  await act(async () => { fireEvent.change(await screen.findByLabelText("Playing for"), {
    target: { value: "full" },
  }); });
  expect(
    screen.getByRole("heading", { name: "Full house" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Call 5 of 90")).toBeInTheDocument();
  await act(async () => { fireEvent.change(screen.getByLabelText("Check a player’s claim"), {
    target: { value: "7" },
  }); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Check card" })); });
  expect(
    await screen.findByRole("heading", { name: "Not quite yet" }),
  ).toBeInTheDocument();
});
it("retains migrated cards and calls from the previous game host", async () => {
  localStorage.setItem(
    "bingoGame",
    JSON.stringify(loadGameFile("Legacy.bingoCards", savedCard)),
  );
  localStorage.setItem("drawnNumbers", "[1,90]");
  await renderEvent();
  await act(async () => { fireEvent.click(
    await screen.findByRole("button", { name: "Return to your game →" }),
  ); });
  expect(
    await screen.findByRole("heading", { name: "Legacy" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Call 2 of 90")).toBeInTheDocument();
});
it("continues drawing when optional sound is enabled but Web Audio is unavailable", async () => {
  seedHost();
  await renderEvent();
  await act(async () => { fireEvent.click(await screen.findByText("Settings")); });
  await act(async () => { fireEvent.click(screen.getByLabelText("Sound effects")); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Draw first number →" })); });
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
});

it("keeps rapid draws distinct under React Strict Mode", async () => {
  seedHost();
  await act(async () => { render(
    <React.StrictMode>
      <ThemeProvider>
        <EventWorkspace />
      </ThemeProvider>
    </React.StrictMode>,
  ); });
  const draw = await screen.findByRole("button", {
    name: "Draw first number →",
  });
  for (let i = 0; i < 5; i++) await act(async () => { fireEvent.click(draw); });
  expect(await screen.findByText("Call 5 of 90")).toBeInTheDocument();
  expect(screen.getAllByLabelText(/^\d+, Called$/)).toHaveLength(4);
  expect(screen.getAllByLabelText(/^\d+, Latest number$/)).toHaveLength(1);
});

it.each(["host", "print"] as const)("opens the %s route with a migrated session", async (entry) => {
  sessionStorage.setItem("bingoGame", JSON.stringify(loadGameFile("Session.bingoCards", savedCard)));
  await act(async () => { render(<ThemeProvider><EventWorkspace entry={entry} /></ThemeProvider>); });
  if (entry === "host") expect(await screen.findByText("Ready for the first call")).toBeInTheDocument();
  else expect(await screen.findByRole("heading", { name: "Your cards are ready." })).toBeInTheDocument();
});

it.each([false, true])("confirms replacement before generating a new deck (%s)", async (confirmed) => {
  seedHost([1]);
  await renderEvent();
  await returnToSetup();
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(confirmed);
  await act(async () => { fireEvent.change(screen.getByLabelText("Event name"), { target: { value: "New deck" } }); });
  await act(async () => { fireEvent.submit(screen.getByLabelText("Event name").closest("form")!); });
  expect(confirm).toHaveBeenCalledTimes(1);
  if (confirmed) await screen.findByRole("heading", { name: "Your cards are ready." });
  else {
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /3.*Host game/ })); });
    expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
  }
});

it("opens the native file chooser and prints the prepared cards", async () => {
  seedHost();
  await renderEvent();
  await returnToSetup();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Host a saved game" })); });
  const choose = jest.spyOn(HTMLInputElement.prototype, "click");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Open game file → Host" })); });
  expect(choose).toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /2.*Print cards/ })); });
  const print = jest.spyOn(window, "print").mockImplementation(() => {});
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Print.*PDF/i })); });
  expect(print).toHaveBeenCalledTimes(1);
});

it.each(["enter", "exit", "unavailable", "rejected"])("handles fullscreen %s", async (mode) => {
  seedHost();
  const request = jest.fn().mockImplementation(() => mode === "rejected" ? Promise.reject(new Error("Denied")) : Promise.resolve());
  const exit = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: mode === "exit" ? document.documentElement : null });
  Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: mode === "unavailable" ? undefined : request });
  Object.defineProperty(document, "exitFullscreen", { configurable: true, value: exit });
  await renderEvent();
  await act(async () => { fireEvent.click(await screen.findByText("Settings")); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Full screen/i })); });
  if (mode === "unavailable" || mode === "rejected") expect(await screen.findByRole("alert")).toHaveTextContent(/full/i);
  else await waitFor(() => expect(mode === "exit" ? exit : request).toHaveBeenCalledTimes(1));
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
});

it.each(["en", "nl"])("announces new calls in %s with sound and voice, releases audio, and never repeats restored calls", async (locale) => {
  mockLocale = locale;
  seedHost([1]);
  const oscillator = { connect: jest.fn(), disconnect: jest.fn(), frequency: { value: 0 }, start: jest.fn(), stop: jest.fn(), onended: null as (() => void) | null };
  const gain = { connect: jest.fn(), disconnect: jest.fn(), gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() } };
  const audio = { resume: jest.fn(), close: jest.fn(), createOscillator: jest.fn(() => oscillator), createGain: jest.fn(() => gain), destination: {}, currentTime: 10 };
  const constructor = jest.fn(function () { return audio; });
  Object.defineProperty(window, "AudioContext", { configurable: true, value: constructor });
  const speech = { cancel: jest.fn(), speak: jest.fn() };
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: speech });
  Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: class { text: string; constructor(text: string) { this.text = text; } } });
  const view = await renderEvent();
  await act(async () => { fireEvent.click(await screen.findByText("Settings")); });
  await act(async () => { fireEvent.click(screen.getByLabelText("Sound effects")); });
  await act(async () => { fireEvent.click(screen.getByLabelText("Announce numbers")); });
  expect(speech.speak).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Draw next number →" })); });
  expect(speech.speak).toHaveBeenCalledWith(expect.objectContaining({ lang: locale === "en" ? "en-GB" : "nl", rate: 0.9 }));
  expect(oscillator.start).toHaveBeenCalledTimes(1);
  oscillator.onended!();
  expect(oscillator.disconnect).toHaveBeenCalledTimes(1);
  expect(gain.disconnect).toHaveBeenCalledTimes(1);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Draw next number →" })); });
  expect(constructor).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(audio.close).toHaveBeenCalledTimes(1);
  expect(speech.cancel).toHaveBeenCalled();
  Object.defineProperty(window, "AudioContext", { configurable: true, value: undefined });
  delete (window as unknown as Record<string, unknown>).speechSynthesis;
  delete (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance;
});

it("keeps drawing if the browser cannot initialize audio", async () => {
  seedHost();
  Object.defineProperty(window, "AudioContext", { configurable: true, value: jest.fn(() => { throw new Error("Audio denied"); }) });
  await renderEvent();
  await act(async () => { fireEvent.click(await screen.findByText("Settings")); });
  await act(async () => { fireEvent.click(screen.getByLabelText("Sound effects")); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Draw first number →" })); });
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
  Object.defineProperty(window, "AudioContext", { configurable: true, value: undefined });
});

it.each(["Family", ""])("downloads a compatible game backup with a safe filename (%s)", async (name) => {
  seedHost();
  const saved = JSON.parse(localStorage.getItem("bingoEventSession.v1")!);
  saved.game = loadGameFile(`${name}.bingoCards`, savedCard);
  localStorage.setItem("bingoEventSession.v1", JSON.stringify(saved));
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: jest.fn(() => "blob:backup") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: jest.fn() });
  let downloadedFilename = "";
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { downloadedFilename = this.download; });
  await renderEvent();
  await act(async () => { fireEvent.click(await screen.findByText("Settings")); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Download.*game/i })); });
  expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  expect(click).toHaveBeenCalledTimes(1);
  expect(downloadedFilename).toBe(`${name || "bingo"}.bingoCards`);
  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:backup"), { timeout: 1500 });
});

it("returns from cards and hosting to prepare a fresh event", async () => {
  seedHost();
  await renderEvent();
  await act(async () => { fireEvent.click(await screen.findByRole("button", { name: "Back to cards" })); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Edit game" })); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Host a saved game" })); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Prepare a new game" })); });
  expect(screen.getByLabelText("Event name")).toHaveValue("Family");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /bingo\./ })); });
  expect(screen.getByLabelText("Event name")).toBeInTheDocument();
});

it("dismisses claim verification using the browser's cancel event", async () => {
  seedHost([1]);
  await renderEvent();
  await act(async () => { fireEvent.change(await screen.findByLabelText("Check a player’s claim"), { target: { value: "7" } }); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Check card" })); });
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: true }));
  await act(async () => { fireEvent.keyDown(document.body, { key: "Enter" }); });
  expect(screen.getByText("Call 1 of 90")).toBeInTheDocument();
});


it("keeps setup usable after card generation fails", async () => {
  jest.spyOn(cardGeneration, "createSharedGame").mockImplementation(() => { throw new Error("Generation failed"); });
  await renderEvent();
  await act(async () => { fireEvent.change(await screen.findByLabelText("Event name"), { target: { value: "Family" } }); });
  await act(async () => { fireEvent.submit(screen.getByLabelText("Event name").closest("form")!); });
  expect(await screen.findByRole("alert")).toHaveTextContent(/generate/i);
  expect(screen.getByRole("button", { name: "Generate game →" })).toBeEnabled();
});

it("changes the card theme and restores the line target after selecting full house", async () => {
  seedHost();
  await renderEvent();
  await act(async () => { fireEvent.change(await screen.findByLabelText("Playing for"), { target: { value: "full" } }); });
  await act(async () => { fireEvent.change(screen.getByLabelText("Playing for"), { target: { value: "line" } }); });
  expect(screen.getByRole("heading", { name: "One line" })).toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Back to cards" })); });
  const theme = screen.getByLabelText("Card theme") as HTMLSelectElement;
  await act(async () => { fireEvent.change(theme, { target: { value: theme.options[1].value } }); });
  expect(theme.value).toBe(theme.options[1].value);
});

it("starts hosting an existing prepared game when opened via the host route", async () => {
  seedHost();
  const session = JSON.parse(localStorage.getItem("bingoEventSession.v1")!);
  session.started = false;
  session.stage = "print";
  localStorage.setItem("bingoEventSession.v1", JSON.stringify(session));
  await act(async () => { render(<ThemeProvider><EventWorkspace entry="host" /></ThemeProvider>); });
  expect(await screen.findByText("Ready for the first call")).toBeInTheDocument();
});

it("still speaks calls when sound effects are enabled but Web Audio is unavailable", async () => {
  seedHost();
  Object.defineProperty(window, "AudioContext", { configurable: true, value: undefined });
  const speak = jest.fn();
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak, cancel: jest.fn() } });
  Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: class { text: string; constructor(text: string) { this.text = text; } } });
  await renderEvent();
  await act(async () => { fireEvent.click(await screen.findByText("Settings")); });
  await act(async () => { fireEvent.click(screen.getByLabelText("Sound effects")); });
  await act(async () => { fireEvent.click(screen.getByLabelText("Announce numbers")); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Draw first number →" })); });
  expect(speak).toHaveBeenCalledWith(expect.objectContaining({ lang: "en-GB" }));
  expect(screen.getByText("Call 1 of 90")).toBeInTheDocument();
});


it("does not draw a queued keyboard call after play is paused in the same interaction", async () => {
  seedHost();
  await renderEvent();
  const pause = await screen.findByRole("button", { name: "Pause" });
  act(() => {
    pause.click();
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  expect(screen.getByText("Ready for the first call")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Draw first number →" })).toBeDisabled();
});

it("keeps appearance controls in a labelled, initially closed header disclosure", async () => {
  const { container } = await renderEvent();
  await screen.findByLabelText("Event name");
  const settings = container.querySelector(".bingo-header-settings") as HTMLDetailsElement;
  expect(settings.open).toBe(false);
  expect(within(settings).getByText("Settings")).toBeInTheDocument();
  expect(within(settings).getByRole("heading", { name: "Preferences", hidden: true })).toBeInTheDocument();
  await act(async () => { fireEvent.click(settings.querySelector("summary")!); });
  expect(settings.open).toBe(true);
  expect(within(settings).getByLabelText("Card theme")).toBeInTheDocument();
  expect(within(settings).getByText("Language")).toBeInTheDocument();
  expect(within(settings).getByRole("button", { name: /Switch to/ })).toBeInTheDocument();
  await act(async () => { fireEvent.click(settings.querySelector("summary")!); });
  expect(settings.open).toBe(false);
});

it("groups display preferences beside event identity and keeps drawing in host controls", async () => {
  seedHost([1, 2]);
  await renderEvent();
  const heading = await screen.findByRole("heading", { name: "Family" });
  const header = heading.closest("header")!;
  expect(within(header).getByRole("button", { name: "Audience view ↗" })).toBeInTheDocument();
  const settings = within(header).getByText("Settings").closest("details") as HTMLDetailsElement;
  expect(settings.open).toBe(false);
  await act(async () => { fireEvent.click(settings.querySelector("summary")!); });
  expect(within(settings).getByRole("heading", { name: "Preferences" })).toBeInTheDocument();
  expect(within(settings).getByLabelText("Card theme")).toBeInTheDocument();
  const controls = screen.getByLabelText("Host controls");
  expect(within(controls).getByRole("button", { name: "Draw next number →" })).toBeInTheDocument();
  expect(within(controls).getByText("Space or Enter to draw")).toBeInTheDocument();
  expect(within(controls).queryByText("Settings")).not.toBeInTheDocument();
});


function storedGame(themeKey = "modern"): library.SavedGame {
  return { id: "stored", updatedAt: 1234, themeKey, theme: themeKey === "modern" ? PRESET_THEMES.modern : { ...PRESET_THEMES.classic, name: "Archived custom" }, session: { ...emptySession, game: loadGameFile("Stored.bingoCards", savedCard), libraryId: "stored", drawn: [1, 90], paused: true, target: "full", started: true, stage: "host", printOptions: { ...DEFAULT_PRINT_OPTIONS, footer: "Stored footer" } } };
}
async function libraryFromHost() {
  const settings = await screen.findByText("Settings");
  await act(async () => { fireEvent.click(settings); });
  await act(async () => { fireEvent.click(within(settings.closest("details")!).getByRole("button", { name: "Saved games", exact: true })); });
  await screen.findByRole("heading", { name: "Saved on this device" });
}
it("adopts the current session into the library and keeps autosaving call progress", async () => {
  seedHost([1]); await renderEvent();
  await waitFor(() => expect(mockSavedRecords.size).toBe(1));
  const id = [...mockSavedRecords.keys()][0];
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Draw next number →" })); });
  await waitFor(() => expect(mockSavedRecords.get(id)!.session.drawn).toHaveLength(2));
  expect(JSON.parse(localStorage.getItem("bingoEventSession.v1")!).libraryId).toBe(id);
  await libraryFromHost();
  expect(screen.getByText("Current game")).toBeInTheDocument();
});
it.each(["resume", "print"] as const)("opens a local saved game for %s without duplicating its record", async mode => {
  mockSavedRecords.set("stored", storedGame()); await renderEvent();
  await act(async () => { fireEvent.click(within(await screen.findByRole("group", { name: messages.event.choosePath })).getByRole("button", { name: "Saved games", exact: true })); });
  const actions = await screen.findByRole("group", { name: "Actions for Stored" });
  await act(async () => { fireEvent.click(within(actions).getByRole("button", { name: mode === "resume" ? "Resume game" : "Print cards" })); });
  if (mode === "resume") {
    expect(await screen.findByText("Call 2 of 90")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume", exact: true })).toBeInTheDocument();
  } else {
    expect(await screen.findByRole("heading", { name: "Your cards are ready." })).toBeInTheDocument();
    expect(within(screen.getByRole("main")).getByText("Stored footer")).toBeInTheDocument();
  }
  await waitFor(() => expect(JSON.parse(localStorage.getItem("bingoEventSession.v1")!).target).toBe("full"));
  expect(mockSavedRecords.size).toBe(1);
  expect(localStorage.getItem("selectedBingoTheme")).toBe("modern");
});
it("restores a saved custom theme even after its original theme key is gone", async () => {
  mockSavedRecords.set("stored", storedGame("deleted-theme")); await renderEvent();
  await act(async () => { fireEvent.click(within(await screen.findByRole("group", { name: messages.event.choosePath })).getByRole("button", { name: "Saved games", exact: true })); });
  await act(async () => { fireEvent.click(within(await screen.findByRole("group", { name: "Actions for Stored" })).getByRole("button", { name: "Print cards" })); });
  await screen.findByRole("heading", { name: "Your cards are ready." });
  expect(localStorage.getItem("selectedBingoTheme")).toMatch(/^custom_/);
});
it.each([false, true])("asks before removing the active saved copy and allows saving it again (%s)", async confirmed => {
  seedHost([1, 90]); const view = await renderEvent();
  await waitFor(() => expect(mockSavedRecords.size).toBe(1));
  await libraryFromHost();
  jest.spyOn(window, "confirm").mockReturnValue(confirmed);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Remove saved copy" })); });
  if (!confirmed) { expect(library.removeLocalGame).not.toHaveBeenCalled(); return; }
  await waitFor(() => expect(mockSavedRecords.size).toBe(0));
  expect(JSON.parse(localStorage.getItem("bingoEventSession.v1")!).drawn).toEqual([1, 90]);
  expect(JSON.parse(localStorage.getItem("bingoEventSession.v1")!).libraryId).toBeNull();
  const saves = jest.mocked(library.saveLocalGame).mock.calls.length;
  view.unmount(); await renderEvent();
  await screen.findByRole("group", { name: messages.event.choosePath });
  await libraryFromHost();
  expect(library.saveLocalGame).toHaveBeenCalledTimes(saves);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save this game again" })); });
  await waitFor(() => expect(mockSavedRecords.size).toBe(1));
});
it("reports unreadable library entries without losing the current session", async () => {
  jest.mocked(library.listLocalGames).mockResolvedValue({ games: [], unreadable: 2 });
  await renderEvent();
  await act(async () => { fireEvent.click(within(await screen.findByRole("group", { name: messages.event.choosePath })).getByRole("button", { name: "Saved games", exact: true })); });
  expect(await screen.findByText(messages.library.unreadable)).toBeInTheDocument();
});
it("reports an unavailable library while keeping game generation usable", async () => {
  jest.mocked(library.listLocalGames).mockRejectedValue(new Error("storage blocked"));
  await renderEvent();
  expect(await screen.findByRole("alert")).toHaveTextContent(messages.library.unavailable);
  expect(screen.getByRole("button", { name: "Generate game →" })).toBeEnabled();
});
it("reports a library write failure and recovers on the next saved update", async () => {
  jest.mocked(library.saveLocalGame).mockRejectedValueOnce(new Error("quota"));
  seedHost(); await renderEvent();
  expect(await screen.findByRole("alert")).toHaveTextContent(messages.library.saveError);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Draw first number →" })); });
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
});
it("keeps the current game when opening a stored record fails", async () => {
  seedHost([1]); await renderEvent(); await waitFor(() => expect(mockSavedRecords.size).toBe(1));
  await libraryFromHost();
  jest.mocked(library.loadLocalGame).mockRejectedValue(new Error("corrupt"));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Resume game" })); });
  expect(await screen.findByRole("alert")).toHaveTextContent(messages.library.openError);
  expect(JSON.parse(localStorage.getItem("bingoEventSession.v1")!).drawn).toEqual([1]);
});
it("keeps a saved copy when deletion fails", async () => {
  seedHost([1]); await renderEvent(); await waitFor(() => expect(mockSavedRecords.size).toBe(1));
  await libraryFromHost();
  jest.spyOn(window, "confirm").mockReturnValue(true);
  jest.mocked(library.removeLocalGame).mockRejectedValue(new Error("blocked"));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Remove saved copy" })); });
  expect(await screen.findByRole("alert")).toHaveTextContent(messages.library.removeError);
  await waitFor(() => expect(mockSavedRecords.size).toBe(1));
  expect(JSON.parse(localStorage.getItem("bingoEventSession.v1")!).libraryId).toEqual(expect.any(String));
});
it("changes print options in the live sheet preview and keeps them in the session", async () => {
  seedHost(); await renderEvent();
  await act(async () => { fireEvent.click(await screen.findByRole("button", { name: "Back to cards" })); });
  await act(async () => { fireEvent.click(screen.getByText(messages.printPreferences.title)); });
  await act(async () => { fireEvent.change(screen.getByLabelText(messages.printPreferences.footer, { exact: true }), { target: { value: "Community evening" } }); });
  expect(within(screen.getByRole("main")).getByText("Community evening")).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("bingoEventSession.v1")!).printOptions.footer).toBe("Community evening");
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
it.each([false, true])("ignores a library index completed after leaving the page (failure %s)", async failure => {
  const pending = deferred<Awaited<ReturnType<typeof library.listLocalGames>>>();
  jest.mocked(library.listLocalGames).mockReturnValue(pending.promise);
  const view = await renderEvent(); view.unmount();
  await act(async () => { if (failure) pending.reject(new Error("closed")); else pending.resolve({ games: [], unreadable: 0 }); });
  expect(library.saveLocalGame).not.toHaveBeenCalled();
});
it.each([false, true])("finishes a pending save without updating a closed page (failure %s)", async failure => {
  const pending = deferred<library.SavedGameSummary>();
  jest.mocked(library.saveLocalGame).mockReturnValueOnce(pending.promise);
  seedHost(); const view = await renderEvent(); view.unmount();
  await act(async () => { if (failure) pending.reject(new Error("closed")); else pending.resolve({ id: "saved", name: "Family", cardCount: 1, calledCount: 0, started: true, updatedAt: 1 }); });
  expect(library.saveLocalGame).toHaveBeenCalledTimes(1);
});
it.each([false, true])("ignores opening a saved game after leaving the page (failure %s)", async failure => {
  mockSavedRecords.set("stored", storedGame()); const view = await renderEvent();
  await act(async () => { fireEvent.click(within(screen.getByRole("group", { name: messages.event.choosePath })).getByRole("button", { name: "Saved games", exact: true })); });
  const pending = deferred<library.SavedGame>(); jest.mocked(library.loadLocalGame).mockReturnValue(pending.promise);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Resume game" })); });
  view.unmount();
  await act(async () => { if (failure) pending.reject(new Error("closed")); else pending.resolve(storedGame()); });
  expect(localStorage.getItem("selectedBingoTheme")).not.toBe("modern");
});
it("opens an unstarted saved game in its print preview", async () => {
  const record = storedGame(); record.session.started = false; mockSavedRecords.set(record.id, record);
  await renderEvent();
  await act(async () => { fireEvent.click(within(screen.getByRole("group", { name: messages.event.choosePath })).getByRole("button", { name: "Saved games", exact: true })); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Open game" })); });
  expect(screen.getByRole("heading", { name: "Your cards are ready." })).toBeInTheDocument();
});
it.each([false, true])("removes an inactive saved game without changing the current identity (failure %s)", async failure => {
  mockSavedRecords.set("stored", storedGame()); seedHost([1]); await renderEvent(); await libraryFromHost();
  const id = JSON.parse(localStorage.getItem("bingoEventSession.v1")!).libraryId;
  jest.spyOn(window, "confirm").mockReturnValue(true);
  if (failure) jest.mocked(library.removeLocalGame).mockRejectedValue(new Error("blocked"));
  await act(async () => { fireEvent.click(within(screen.getByRole("group", { name: "Actions for Stored" })).getByRole("button", { name: "Remove saved copy" })); });
  expect(JSON.parse(localStorage.getItem("bingoEventSession.v1")!).libraryId).toBe(id);
  expect(mockSavedRecords.has("stored")).toBe(failure);
});
it("drains in-flight saves and skips queued writes when the active saved copy is removed", async () => {
  seedHost([1]); await renderEvent(); await libraryFromHost();
  const pending = deferred<library.SavedGameSummary>();
  jest.mocked(library.saveLocalGame).mockReturnValueOnce(pending.promise);
  // Two preference updates queue writes behind the first pending save.
  const settings = screen.getByText("Settings").closest("details")!;
  await act(async () => { fireEvent.change(within(settings).getByLabelText("Card theme"), { target: { value: "modern" } }); });
  await act(async () => { fireEvent.change(within(settings).getByLabelText("Card theme"), { target: { value: "classic" } }); });
  const id = JSON.parse(localStorage.getItem("bingoEventSession.v1")!).libraryId;
  jest.spyOn(window, "confirm").mockReturnValue(true);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Remove saved copy" })); });
  await act(async () => { pending.resolve({ id, name: "Family", cardCount: 1, calledCount: 1, started: true, updatedAt: 1 }); });
  expect(mockSavedRecords.size).toBe(0);
  expect(JSON.parse(localStorage.getItem("bingoEventSession.v1")!).libraryId).toBeNull();
});
it("keeps a newly saved identity if removing the previous saved copy later fails", async () => {
  seedHost(); await renderEvent(); await libraryFromHost();
  const oldId = JSON.parse(localStorage.getItem("bingoEventSession.v1")!).libraryId;
  const pending = deferred<void>(); jest.mocked(library.removeLocalGame).mockReturnValue(pending.promise);
  jest.spyOn(window, "confirm").mockReturnValue(true);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Remove saved copy" })); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save this game again" })); });
  const newId = JSON.parse(localStorage.getItem("bingoEventSession.v1")!).libraryId;
  expect(newId).not.toBe(oldId);
  await act(async () => { pending.reject(new Error("blocked")); });
  expect(JSON.parse(localStorage.getItem("bingoEventSession.v1")!).libraryId).toBe(newId);
});

it('opens a shared game without another game’s calls and resumes its own local progress', async () => {
  const { webcrypto } = await import('node:crypto');
  const { TextEncoder, TextDecoder } = await import('node:util');
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  Object.assign(globalThis, { TextEncoder, TextDecoder });
  const { createSharedGame, encodeGameLink } = await import('../../utils/shareGame');
  const link = await encodeGameLink(await createSharedGame('Shared evening', 2));
  seedHost([5, 6]);
  window.history.replaceState(null, '', '/' + link);
  const view = await renderEvent();
  await screen.findByRole('heading', { name: 'Your cards are ready.' });
  expect(screen.getAllByText(/Shared evening/).length).toBeGreaterThan(0);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Host this game →' })); });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Draw first number →' })); });
  await screen.findByText('Call 1 of 90');
  view.unmount();
  await renderEvent();
  await screen.findByText('Call 1 of 90');
  window.history.replaceState(null, '', '/');
});

it('shares only game contents and offers manual copying when clipboard is unavailable', async () => {
  seedHost([1, 90]);
  await renderEvent();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Back to cards' })); });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Share game link' })); });
  const input = await screen.findByLabelText('Game link') as HTMLInputElement;
  const { decodeGameLink } = await import('../../utils/shareGame');
  const decoded = await decodeGameLink(new URL(input.value).hash);
  expect(decoded.filename).toBe('Family');
  expect(Object.keys(decoded).sort()).toEqual(['cards', 'filename']);
  expect(screen.getByText('Select and copy the link above.')).toBeInTheDocument();
  fireEvent.focus(input);
  expect(input.selectionEnd).toBe(input.value.length);
});

it('keeps the saved game after an invalid shared link', async () => {
  seedHost([1, 90]);
  const saved = localStorage.getItem('bingoEventSession.v1');
  window.history.replaceState(null, '', '/#bingo=broken');
  await renderEvent();
  expect(await screen.findByRole('alert')).toHaveTextContent('game link is invalid');
  expect(localStorage.getItem('bingoEventSession.v1')).toBe(saved);
});

it('copies a shared link when clipboard access is available', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  try {
    seedHost();
    await renderEvent();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Back to cards' })); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Share game link' })); });
    await screen.findByText('Link copied.');
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/en/game#bingo='));
  } finally {
    if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor);
    else Reflect.deleteProperty(navigator, 'clipboard');
  }
});

it('offers a file fallback when a deck is too large to share as a link', async () => {
  const game = await cardGeneration.createSharedGame('Large deck', 1000);
  delete game.generation;
  localStorage.setItem('bingoEventSession.v1', JSON.stringify({ ...emptySession, game, stage: 'print' }));
  await renderEvent();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Share game link' })); });
  await screen.findByText(/For large games, download and share/);
  expect(screen.queryByLabelText('Game link')).not.toBeInTheDocument();
});

it.each(['broken', 'wrong game', 'storage denied'])('opens valid shared cards despite %s local progress', async mode => {
  const game = await cardGeneration.createSharedGame('Shared recovery', 1);
  const hash = await cardGeneration.encodeGameLink(game);
  const key = await cardGeneration.sharedGameKey(game);
  if (mode === 'broken') localStorage.setItem(key, 'broken');
  if (mode === 'wrong game') {
    seedHost([1]);
    localStorage.setItem(key, localStorage.getItem('bingoEventSession.v1')!);
  }
  let storage: jest.SpyInstance | undefined;
  if (mode === 'storage denied') {
    const get = Storage.prototype.getItem;
    storage = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, name: string) {
      if (name === key) throw new Error('Denied');
      return get.call(this, name);
    });
  }
  window.history.replaceState(null, '', '/' + hash);
  try {
    await renderEvent();
    await screen.findByRole('heading', { name: 'Your cards are ready.' });
    expect(screen.getAllByText(/Shared recovery/).length).toBeGreaterThan(0);
  } finally { storage?.mockRestore(); }
});

it('handles a different shared link without reloading the page', async () => {
  const one = await cardGeneration.createSharedGame('First shared', 1);
  const two = await cardGeneration.createSharedGame('Second shared', 1);
  window.history.replaceState(null, '', '/' + await cardGeneration.encodeGameLink(one));
  await renderEvent();
  await screen.findByRole('heading', { name: 'Your cards are ready.' });
  await act(async () => {
    window.history.replaceState(null, '', '/' + await cardGeneration.encodeGameLink(two));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  await waitFor(() => expect(screen.getAllByText(/Second shared/).length).toBeGreaterThan(0));
});

it('discards a pending shared link when the workspace unmounts', async () => {
  let resolve!: (game: Awaited<ReturnType<typeof cardGeneration.createSharedGame>>) => void;
  const game = await cardGeneration.createSharedGame('Cancelled', 1);
  jest.spyOn(cardGeneration, 'decodeGameLink').mockReturnValue(new Promise(done => { resolve = done; }));
  window.history.replaceState(null, '', '/#bingo=pending');
  const view = await renderEvent();
  view.unmount();
  await act(async () => { resolve(game); });
  expect(localStorage.getItem('bingoEventSession.v1')).toBeNull();
});

it('discards failed pending links after unmount', async () => {
  let reject!: (error: Error) => void;
  jest.spyOn(cardGeneration, 'decodeGameLink').mockReturnValue(new Promise((_done, fail) => { reject = fail; }));
  window.history.replaceState(null, '', '/#bingo=pending');
  const view = await renderEvent();
  view.unmount();
  await act(async () => { reject(new Error('Invalid')); });
  expect(localStorage.getItem('bingoEventSession.v1')).toBeNull();
});

it('discards pending generation after unmount', async () => {
  const game = await cardGeneration.createSharedGame('Cancelled generation', 1);
  let resolve!: (value: typeof game) => void;
  const started = jest.spyOn(cardGeneration, 'createSharedGame').mockReturnValue(new Promise(done => { resolve = done; }));
  const view = await renderEvent();
  await act(async () => { fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'Cancelled generation' } }); });
  await act(async () => { fireEvent.submit(screen.getByLabelText('Event name').closest('form')!); });
  await waitFor(() => expect(started).toHaveBeenCalled());
  view.unmount();
  await act(async () => { resolve(game); });
  expect(localStorage.getItem('bingoEventSession.v1')).toBeNull();
});

it('discards a pending local copy after unmount', async () => {
  const game = await cardGeneration.createSharedGame('Cancelled local copy', 1);
  const hash = await cardGeneration.encodeGameLink(game);
  const key = await cardGeneration.sharedGameKey(game);
  localStorage.setItem(key, JSON.stringify({ ...emptySession, game }));
  let resolve!: (value: string) => void;
  const original = cardGeneration.sharedGameKey;
  const keySpy = jest.spyOn(cardGeneration, 'sharedGameKey').mockResolvedValueOnce(key).mockReturnValueOnce(new Promise(done => { resolve = done; }));
  window.history.replaceState(null, '', '/' + hash);
  const view = await renderEvent();
  await waitFor(() => expect(keySpy).toHaveBeenCalledTimes(2));
  view.unmount();
  await act(async () => { resolve(key); });
  keySpy.mockImplementation(original);
  expect(localStorage.getItem('bingoEventSession.v1')).toBeNull();
});
