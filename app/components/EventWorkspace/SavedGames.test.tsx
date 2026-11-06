import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import messages from "../../../messages/en.json";
import { SavedGames } from "./SavedGames";

let mockLocale = "en";
jest.mock("next-intl", () => ({
  useLocale: () => mockLocale,
  useTranslations: () => (key: string, values: Record<string, string | number> = {}) => {
    let text = messages.library[key as keyof typeof messages.library];
    for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{${name}}`, String(value));
    return text;
  },
}));

const games = [
  { id: "family", name: "Family evening", cardCount: 24, calledCount: 17, started: true, updatedAt: Date.UTC(2026, 10, 6, 12, 30) },
  { id: "school", name: "School bingo", cardCount: 80, calledCount: 0, started: false, updatedAt: Date.UTC(2026, 10, 5, 9) },
];
const onOpen = jest.fn();
const onRemove = jest.fn();
beforeEach(() => {
  mockLocale = "en";
  onOpen.mockClear();
  onRemove.mockClear();
});
function show(overrides = {}) {
  return render(<SavedGames games={games} activeId="family" loading={false} onOpen={onOpen} onRemove={onRemove} {...overrides} />);
}

it("announces loading without displaying empty-state or game actions", () => {
  show({ loading: true });
  expect(screen.getByRole("heading", { name: "Saved on this device" })).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Loading your saved games…");
  expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("explains how to begin an empty local library and keep an external backup", () => {
  show({ games: [], activeId: null });
  expect(screen.getByRole("heading", { name: "Your games will be here" })).toBeInTheDocument();
  expect(screen.getByText(/Generate a game or open a game file/)).toBeInTheDocument();
  expect(screen.getByText(/clearing browser data removes these saved copies/)).toBeInTheDocument();
  expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
});

it("shows game identity, current selection, saved date and called progress", () => {
  show();
  const items = screen.getAllByRole("listitem");
  expect(items).toHaveLength(2);
  expect(within(items[0]).getByRole("heading", { name: "Family evening" })).toBeInTheDocument();
  expect(within(items[0]).getByText("Current game")).toBeInTheDocument();
  expect(within(items[1]).queryByText("Current game")).not.toBeInTheDocument();
  expect(within(items[0]).getByText("24 cards")).toBeInTheDocument();
  expect(within(items[0]).getByText("17 of 90 called")).toBeInTheDocument();
  const date = items[0].querySelector("time")!;
  expect(date).toHaveAttribute("datetime", "2026-11-06T12:30:00.000Z");
  expect(date).toHaveTextContent("Nov 6, 2026");
  expect(within(items[0]).getByRole("progressbar", { name: "17 of 90 numbers called" })).toHaveAttribute("value", "17");
  expect(screen.getByRole("status")).toHaveTextContent("2 of 2 games");
});

it("searches game names without case or surrounding whitespace and restores the list when cleared", () => {
  show();
  const search = screen.getByRole("searchbox", { name: "Find a game" });
  fireEvent.change(search, { target: { value: "  EVENING  " } });
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  expect(screen.getByRole("heading", { name: "Family evening" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "School bingo" })).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("1 of 2 games");
  fireEvent.change(search, { target: { value: "nothing matches" } });
  expect(screen.getByRole("heading", { name: "No games match this name" })).toBeInTheDocument();
  expect(screen.getByText(/Try another name or clear the search/)).toBeInTheDocument();
  expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  fireEvent.change(search, { target: { value: "" } });
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
});

it("opens or resumes the selected game and requests printing or removal independently", () => {
  show();
  const family = screen.getByRole("group", { name: "Actions for Family evening" });
  const school = screen.getByRole("group", { name: "Actions for School bingo" });
  fireEvent.click(within(family).getByRole("button", { name: "Resume game" }));
  expect(onOpen).toHaveBeenLastCalledWith("family", "resume");
  fireEvent.click(within(school).getByRole("button", { name: "Open game" }));
  expect(onOpen).toHaveBeenLastCalledWith("school", "resume");
  fireEvent.click(within(school).getByRole("button", { name: "Print cards" }));
  expect(onOpen).toHaveBeenLastCalledWith("school", "print");
  fireEvent.click(within(family).getByRole("button", { name: "Remove saved copy" }));
  expect(onRemove).toHaveBeenCalledWith("family");
  expect(onOpen).toHaveBeenCalledTimes(3);
});

it("formats saved dates using the active locale and supports no active game", () => {
  mockLocale = "pt";
  const { container } = show({ activeId: null });
  expect(screen.queryByText("Current game")).not.toBeInTheDocument();
  expect(container.querySelector("time")).toHaveTextContent(/6.*nov.*2026/i);
});
