import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import messages from "../../../messages/en.json";
import { ThemeProvider } from "../ThemeProvider";
import { loadGameFile } from "../../utils/gameFiles";
import { EventWorkspace } from "./EventWorkspace";

jest.mock("next-intl", () => ({
  useLocale: () => "en",
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
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => jest.restoreAllMocks());
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

  fireEvent.click(screen.getByRole("radio", { name: "8" }));
  expect(printed().querySelectorAll(".bingo-flow-print-sheet")).toHaveLength(2);
  expect(screen.getByText("8 per sheet · 2 A4 sheets")).toBeInTheDocument();
  expect(printed().querySelectorAll(".bingo-flow-card")).toHaveLength(9);
  expect(
    within(screen.getByRole("main")).getByText("Sheet 1 of 2"),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem("bingoEventSession.v1")!).cardsPerPage,
    ).toBe(8),
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
