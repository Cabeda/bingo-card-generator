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
import * as cardGeneration from "../../utils/utils";
import { EventWorkspace } from "./EventWorkspace";

let mockLocale = "en";
jest.mock("next-intl", () => ({
  useLocale: () => mockLocale,
  useTranslations:
    () => (key: string, values?: Record<string, string | number>) => {
      let text =
        (messages as unknown as { event: Record<string, string> }).event?.[
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
function renderEvent() {
  return render(
    <ThemeProvider>
      <EventWorkspace />
    </ThemeProvider>,
  );
}
beforeEach(() => {
  mockLocale = "en";
  localStorage.clear();
  sessionStorage.clear();
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
it("generates, previews and hosts the same cards, preserving calls when returning to print", async () => {
  renderEvent();
  fireEvent.change(await screen.findByLabelText("Event name"), {
    target: { value: "Family night" },
  });
  fireEvent.change(await screen.findByLabelText("Number of cards"), {
    target: { value: "4" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Generate game →" }));
  expect(
    await screen.findByRole("heading", { name: "Your cards are ready." }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole("main")).getByText("Card 001"),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Host this game →" }));
  expect(
    await screen.findByText("Ready for the first call"),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Draw first number →" }));
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /2.*Print cards/ }));
  fireEvent.click(
    screen.getByRole("button", { name: "Return to your game →" }),
  );
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem("bingoEventSession.v1")!).drawn,
    ).toHaveLength(1),
  );
});

it("changes how many cards share a sheet without splitting card content", async () => {
  renderEvent();
  fireEvent.change(await screen.findByLabelText("Event name"), {
    target: { value: "Office party" },
  });
  fireEvent.change(await screen.findByLabelText("Number of cards"), {
    target: { value: "9" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Generate game →" }));
  await screen.findByRole("heading", { name: "Your cards are ready." });

  const printed = (): Element =>
    document.querySelector(".bingo-flow-print-only")!;
  expect(printed().querySelectorAll(".bingo-flow-print-sheet")).toHaveLength(3);
  expect(screen.getByText("4 per sheet · 3 A4 sheets")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("radio", { name: "2" }));
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

  fireEvent.click(screen.getByRole("radio", { name: "1" }));
  expect(printed().querySelectorAll(".bingo-flow-print-sheet")).toHaveLength(9);
  expect(screen.getByText("1 per sheet · 9 A4 sheets")).toBeInTheDocument();
});

it("opens a legacy backup straight into hosting without generation or printing", async () => {
  const { readFileSync } = await import("fs");
  renderEvent();
  fireEvent.click(
    await screen.findByRole("button", { name: "Host a saved game" }),
  );
  expect(
    screen.queryByRole("button", { name: "Generate game →" }),
  ).not.toBeInTheDocument();
  const file = new File(["legacy backup"], "Family night.BINGOCARDS", {
    type: "text/plain",
  });
  Object.defineProperty(file, "text", {
    value: async () => readFileSync("app/test.bingoCards", "utf8"),
  });
  fireEvent.change(screen.getByLabelText("Open saved bingo game"), {
    target: { files: [file] },
  });
  expect(
    await screen.findByRole("heading", { name: "Family night" }),
  ).toBeInTheDocument();
  expect(screen.getByText("90-BALL BINGO · 200 CARDS")).toBeInTheDocument();
  expect(screen.getByText("Ready for the first call")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Draw first number →" }),
  ).toBeEnabled();
});

it("restores the game and calls after refresh and keeps them when an invalid file is selected", async () => {
  const view = renderEvent();
  fireEvent.change(await screen.findByLabelText("Event name"), {
    target: { value: "Sunday bingo" },
  });
  fireEvent.change(screen.getByLabelText("Number of cards"), {
    target: { value: "2" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Generate game →" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Host this game →" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Draw first number →" }));
  await screen.findByText("Call 1 of 90");
  view.unmount();
  renderEvent();
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /1.*Generate game/ }));
  fireEvent.click(screen.getByRole("button", { name: "Host a saved game" }));
  const invalid = new File(["bad"], "broken.bingoCards");
  Object.defineProperty(invalid, "text", { value: async () => "not a game" });
  fireEvent.change(screen.getByLabelText("Open saved bingo game"), {
    target: { files: [invalid] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Your current game has been kept",
  );
  fireEvent.click(screen.getByRole("button", { name: /3.*Host game/ }));
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
  renderEvent();
  fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
  const draw = screen.getByRole("button", { name: "Draw next number →" });
  expect(draw).toBeDisabled();
  fireEvent.click(draw);
  fireEvent.keyDown(document.body, { key: " " });
  expect(screen.getByText("Call 1 of 90")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));
  fireEvent.click(draw);
  expect(await screen.findByText("Call 2 of 90")).toBeInTheDocument();
});
it("draws exactly once per keyboard action and ignores form input, repeats and unrelated keys", async () => {
  seedHost();
  renderEvent();
  await screen.findByText("Ready for the first call");
  fireEvent.keyDown(document.body, { key: " " });
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
  fireEvent.keyDown(document.body, { key: " ", repeat: true });
  fireEvent.keyDown(document.body, { key: "a" });
  fireEvent.keyDown(screen.getByLabelText("Check a player’s claim"), {
    key: "Enter",
  });
  expect(screen.getByText("Call 1 of 90")).toBeInTheDocument();
  fireEvent.keyDown(document.body, { key: "Enter" });
  expect(await screen.findByText("Call 2 of 90")).toBeInTheDocument();
});
it("does not intercept Space or Enter before hosting", async () => {
  renderEvent();
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
  renderEvent();
  await screen.findByText("Ready for the first call");
  fireEvent.keyDown(window, { key: "Enter" });
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
});
it("stops at the final ball, including 90, and cannot draw a 91st call", async () => {
  seedHost(Array.from({ length: 89 }, (_, i) => i + 1));
  renderEvent();
  fireEvent.click(
    await screen.findByRole("button", { name: "Draw next number →" }),
  );
  expect(await screen.findByText("Call 90 of 90")).toBeInTheDocument();
  expect(screen.getByText("All numbers called")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Draw next number →" }),
  ).toBeDisabled();
  fireEvent.keyDown(document.body, { key: "Enter" });
  expect(screen.getByText("Call 90 of 90")).toBeInTheDocument();
});
it("removes host actions and keyboard draws from audience view", async () => {
  seedHost([1]);
  renderEvent();
  fireEvent.click(
    await screen.findByRole("button", { name: "Audience view ↗" }),
  );
  expect(
    screen.queryByRole("button", { name: "Draw next number →" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByLabelText("Check a player’s claim"),
  ).not.toBeInTheDocument();
  fireEvent.keyDown(document.body, { key: " " });
  expect(screen.getByText("Call 1 of 90")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Return to host" }));
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
    renderEvent();
    fireEvent.change(await screen.findByLabelText("Check a player’s claim"), {
      target: { value: card },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check card" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: expected }),
    ).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: " " });
    expect(screen.getByText(`Call ${drawn.length} of 90`)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
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
    renderEvent();
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(confirmed);
    fireEvent.click(await screen.findByText("Settings"));
    fireEvent.click(screen.getByRole("button", { name: "Restart draws" }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(confirmed ? "Ready for the first call" : "Call 2 of 90"),
    ).toBeInTheDocument();
    expect(screen.getByText("90-BALL BINGO · 1 CARDS")).toBeInTheDocument();
  },
);
it.each([false, true])(
  "replacing a loaded game requires confirmation (%s)",
  async (confirmed) => {
    seedHost([1, 90]);
    renderEvent();
    fireEvent.click(
      await screen.findByRole("button", { name: /1.*Generate game/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Host a saved game" }));
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(confirmed);
    selectFile("Replacement.bingoCards", savedCard);
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    if (confirmed) {
      expect(
        await screen.findByRole("heading", { name: "Replacement" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Ready for the first call")).toBeInTheDocument();
    } else {
      fireEvent.click(screen.getByRole("button", { name: /3.*Host game/ }));
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
    renderEvent();
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
  renderEvent();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "cannot save this session",
  );
  fireEvent.click(screen.getByRole("button", { name: "Draw first number →" }));
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
  expect(set).toHaveBeenCalled();
});
it("rejects an oversized backup before reading it", async () => {
  renderEvent();
  fireEvent.click(
    await screen.findByRole("button", { name: "Host a saved game" }),
  );
  const file = new File(["x"], "huge.bingoCards");
  const read = jest.fn().mockResolvedValue(savedCard);
  Object.defineProperty(file, "text", { value: read });
  Object.defineProperty(file, "size", { value: 10 * 1024 * 1024 + 1 });
  fireEvent.change(screen.getByLabelText("Open saved bingo game"), {
    target: { files: [file] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to open this file",
  );
  expect(read).not.toHaveBeenCalled();
});
it("handles read failures without leaving the file button disabled", async () => {
  renderEvent();
  fireEvent.click(
    await screen.findByRole("button", { name: "Host a saved game" }),
  );
  const file = new File(["x"], "unreadable.bingoCards");
  Object.defineProperty(file, "text", {
    value: async () => {
      throw new Error("Read failure");
    },
  });
  fireEvent.change(screen.getByLabelText("Open saved bingo game"), {
    target: { files: [file] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to open this file",
  );
  expect(
    screen.getByRole("button", { name: "Open game file → Host" }),
  ).toBeEnabled();
});

it("does not clear or replace a game when the file chooser is cancelled", async () => {
  seedHost([1]);
  renderEvent();
  fireEvent.click(
    await screen.findByRole("button", { name: /1.*Generate game/ }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Host a saved game" }));
  fireEvent.change(screen.getByLabelText("Open saved bingo game"), {
    target: { files: [] },
  });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /3.*Host game/ }));
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
});
it.each([0, -1, 1.5, 1001])(
  "rejects a generation request with %s cards",
  async (count) => {
    renderEvent();
    fireEvent.change(await screen.findByLabelText("Event name"), {
      target: { value: "Family" },
    });
    fireEvent.change(screen.getByLabelText("Number of cards"), {
      target: { value: String(count) },
    });
    fireEvent.submit(screen.getByLabelText("Event name").closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "between 1 and 1,000 cards",
    );
    expect(screen.getByRole("button", { name: /3.*Host game/ })).toBeDisabled();
  },
);
it("rejects a blank event name and generates a valid one-card game", async () => {
  renderEvent();
  const name = await screen.findByLabelText("Event name");
  fireEvent.change(name, { target: { value: "   " } });
  fireEvent.submit(name.closest("form")!);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Enter an event name",
  );
  fireEvent.change(name, { target: { value: " One player " } });
  fireEvent.change(screen.getByLabelText("Number of cards"), {
    target: { value: "1" },
  });
  fireEvent.submit(name.closest("form")!);
  expect(
    await screen.findByRole("heading", { name: "Your cards are ready." }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole("main")).getByText("Card 001"),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole("main")).queryByText("Card 002"),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Host this game →" }));
  expect(
    await screen.findByRole("heading", { name: "One player" }),
  ).toBeInTheDocument();
});
it("changes the winning target without altering the current draw history", async () => {
  seedHost([1, 21, 31, 51, 71]);
  renderEvent();
  fireEvent.change(await screen.findByLabelText("Playing for"), {
    target: { value: "full" },
  });
  expect(
    screen.getByRole("heading", { name: "Full house" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Call 5 of 90")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Check a player’s claim"), {
    target: { value: "7" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Check card" }));
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
  renderEvent();
  fireEvent.click(
    await screen.findByRole("button", { name: "Return to your game →" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Legacy" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Call 2 of 90")).toBeInTheDocument();
});
it("continues drawing when optional sound is enabled but Web Audio is unavailable", async () => {
  seedHost();
  renderEvent();
  fireEvent.click(await screen.findByText("Settings"));
  fireEvent.click(screen.getByLabelText("Sound effects"));
  fireEvent.click(screen.getByRole("button", { name: "Draw first number →" }));
  expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
});

it("keeps rapid draws distinct under React Strict Mode", async () => {
  seedHost();
  render(
    <React.StrictMode>
      <ThemeProvider>
        <EventWorkspace />
      </ThemeProvider>
    </React.StrictMode>,
  );
  const draw = await screen.findByRole("button", {
    name: "Draw first number →",
  });
  for (let i = 0; i < 5; i++) fireEvent.click(draw);
  expect(await screen.findByText("Call 5 of 90")).toBeInTheDocument();
  expect(screen.getAllByLabelText(/^\d+, Called$/)).toHaveLength(4);
  expect(screen.getAllByLabelText(/^\d+, LATEST NUMBER$/)).toHaveLength(1);
});

it.each(["host", "print"] as const)("opens the %s route with a migrated session", async (entry) => {
  sessionStorage.setItem("bingoGame", JSON.stringify(loadGameFile("Session.bingoCards", savedCard)));
  render(<ThemeProvider><EventWorkspace entry={entry} /></ThemeProvider>);
  if (entry === "host") expect(await screen.findByText("Ready for the first call")).toBeInTheDocument();
  else expect(await screen.findByRole("heading", { name: "Your cards are ready." })).toBeInTheDocument();
});

it.each([false, true])("confirms replacement before generating a new deck (%s)", async (confirmed) => {
  seedHost([1]);
  renderEvent();
  fireEvent.click(await screen.findByRole("button", { name: /1.*Generate game/ }));
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(confirmed);
  fireEvent.change(screen.getByLabelText("Event name"), { target: { value: "New deck" } });
  fireEvent.submit(screen.getByLabelText("Event name").closest("form")!);
  expect(confirm).toHaveBeenCalledTimes(1);
  if (confirmed) await screen.findByRole("heading", { name: "Your cards are ready." });
  else {
    fireEvent.click(screen.getByRole("button", { name: /3.*Host game/ }));
    expect(await screen.findByText("Call 1 of 90")).toBeInTheDocument();
  }
});

it("opens the native file chooser and prints the prepared cards", async () => {
  seedHost();
  renderEvent();
  fireEvent.click(await screen.findByRole("button", { name: /1.*Generate game/ }));
  fireEvent.click(screen.getByRole("button", { name: "Host a saved game" }));
  const choose = jest.spyOn(HTMLInputElement.prototype, "click");
  fireEvent.click(screen.getByRole("button", { name: "Open game file → Host" }));
  expect(choose).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /2.*Print cards/ }));
  const print = jest.spyOn(window, "print").mockImplementation(() => {});
  fireEvent.click(screen.getByRole("button", { name: /Print.*PDF/i }));
  expect(print).toHaveBeenCalledTimes(1);
});

it.each(["enter", "exit", "unavailable", "rejected"])("handles fullscreen %s", async (mode) => {
  seedHost();
  const request = jest.fn().mockImplementation(() => mode === "rejected" ? Promise.reject(new Error("Denied")) : Promise.resolve());
  const exit = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: mode === "exit" ? document.documentElement : null });
  Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: mode === "unavailable" ? undefined : request });
  Object.defineProperty(document, "exitFullscreen", { configurable: true, value: exit });
  renderEvent();
  fireEvent.click(await screen.findByText("Settings"));
  fireEvent.click(screen.getByRole("button", { name: /Full screen/i }));
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
  const view = renderEvent();
  fireEvent.click(await screen.findByText("Settings"));
  fireEvent.click(screen.getByLabelText("Sound effects"));
  fireEvent.click(screen.getByLabelText("Announce numbers"));
  expect(speech.speak).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Draw next number →" }));
  expect(speech.speak).toHaveBeenCalledWith(expect.objectContaining({ lang: locale === "en" ? "en-GB" : "nl", rate: 0.9 }));
  expect(oscillator.start).toHaveBeenCalledTimes(1);
  oscillator.onended!();
  expect(oscillator.disconnect).toHaveBeenCalledTimes(1);
  expect(gain.disconnect).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Draw next number →" }));
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
  renderEvent();
  fireEvent.click(await screen.findByText("Settings"));
  fireEvent.click(screen.getByLabelText("Sound effects"));
  fireEvent.click(screen.getByRole("button", { name: "Draw first number →" }));
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
  renderEvent();
  fireEvent.click(await screen.findByText("Settings"));
  fireEvent.click(screen.getByRole("button", { name: /Download.*game/i }));
  expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  expect(click).toHaveBeenCalledTimes(1);
  expect(downloadedFilename).toBe(`${name || "bingo"}.bingoCards`);
  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:backup"), { timeout: 1500 });
});

it("returns from cards and hosting to prepare a fresh event", async () => {
  seedHost();
  renderEvent();
  fireEvent.click(await screen.findByRole("button", { name: "Back to cards" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit game" }));
  fireEvent.click(screen.getByRole("button", { name: "Host a saved game" }));
  fireEvent.click(screen.getByRole("button", { name: "Prepare a new game" }));
  expect(screen.getByLabelText("Event name")).toHaveValue("Family");
  fireEvent.click(screen.getByRole("button", { name: /bingo\./ }));
  expect(screen.getByLabelText("Event name")).toBeInTheDocument();
});

it("dismisses claim verification using the browser's cancel event", async () => {
  seedHost([1]);
  renderEvent();
  fireEvent.change(await screen.findByLabelText("Check a player’s claim"), { target: { value: "7" } });
  fireEvent.click(screen.getByRole("button", { name: "Check card" }));
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: true }));
  fireEvent.keyDown(document.body, { key: "Enter" });
  expect(screen.getByText("Call 1 of 90")).toBeInTheDocument();
});


it("keeps setup usable after card generation fails", async () => {
  jest.spyOn(cardGeneration, "generateRandomBingoCards").mockImplementation(() => { throw new Error("Generation failed"); });
  renderEvent();
  fireEvent.change(await screen.findByLabelText("Event name"), { target: { value: "Family" } });
  fireEvent.submit(screen.getByLabelText("Event name").closest("form")!);
  expect(await screen.findByRole("alert")).toHaveTextContent(/generate/i);
  expect(screen.getByRole("button", { name: "Generate game →" })).toBeEnabled();
});

it("changes the card theme and restores the line target after selecting full house", async () => {
  seedHost();
  renderEvent();
  fireEvent.change(await screen.findByLabelText("Playing for"), { target: { value: "full" } });
  fireEvent.change(screen.getByLabelText("Playing for"), { target: { value: "line" } });
  expect(screen.getByRole("heading", { name: "One line" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /2.*Print cards/ }));
  const theme = screen.getByLabelText("Card theme") as HTMLSelectElement;
  fireEvent.change(theme, { target: { value: theme.options[1].value } });
  expect(theme.value).toBe(theme.options[1].value);
});

it("starts hosting an existing prepared game when opened via the host route", async () => {
  seedHost();
  const session = JSON.parse(localStorage.getItem("bingoEventSession.v1")!);
  session.started = false;
  session.stage = "print";
  localStorage.setItem("bingoEventSession.v1", JSON.stringify(session));
  render(<ThemeProvider><EventWorkspace entry="host" /></ThemeProvider>);
  expect(await screen.findByText("Ready for the first call")).toBeInTheDocument();
});

it("still speaks calls when sound effects are enabled but Web Audio is unavailable", async () => {
  seedHost();
  Object.defineProperty(window, "AudioContext", { configurable: true, value: undefined });
  const speak = jest.fn();
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak, cancel: jest.fn() } });
  Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: class { text: string; constructor(text: string) { this.text = text; } } });
  renderEvent();
  fireEvent.click(await screen.findByText("Settings"));
  fireEvent.click(screen.getByLabelText("Sound effects"));
  fireEvent.click(screen.getByLabelText("Announce numbers"));
  fireEvent.click(screen.getByRole("button", { name: "Draw first number →" }));
  expect(speak).toHaveBeenCalledWith(expect.objectContaining({ lang: "en-GB" }));
  expect(screen.getByText("Call 1 of 90")).toBeInTheDocument();
});


it("does not draw a queued keyboard call after play is paused in the same interaction", async () => {
  seedHost();
  renderEvent();
  const pause = await screen.findByRole("button", { name: "Pause" });
  act(() => {
    pause.click();
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  expect(screen.getByText("Ready for the first call")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Draw first number →" })).toBeDisabled();
});
