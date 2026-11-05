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
beforeEach(() => localStorage.clear());
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
