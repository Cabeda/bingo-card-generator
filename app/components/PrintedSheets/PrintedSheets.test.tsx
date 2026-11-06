import React from "react";
import { render, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { loadGameFile } from "../../utils/gameFiles";
import { PRESET_THEMES } from "../../utils/themes";
import { PrintedSheets } from "./PrintedSheets";

jest.mock("next-intl", () => ({
  useTranslations: () => () =>
    "90-ball bingo · One line, then full house",
}));
const cards = loadGameFile("Family.bingoCards", readFileSync("app/test.bingoCards", "utf8")).cards.slice(0, 9);
const props = { cards, eventName: "Family night", cardsPerPage: 4, theme: PRESET_THEMES.classic };

it.each([
  [1, [[1], [2], [3], [4], [5], [6], [7], [8], [9]]],
  [2, [[1, 2], [3, 4], [5, 6], [7, 8], [9]]],
  [3, [[1, 2, 3], [4, 5, 6], [7, 8, 9]]],
  [4, [[1, 2, 3, 4], [5, 6, 7, 8], [9]]],
] as const)("prints ordered, intact cards at %i per sheet", (cardsPerPage, expected) => {
  const { container } = render(<PrintedSheets {...props} cardsPerPage={cardsPerPage} />);
  const sheets = [...container.querySelectorAll("section")];
  expect(sheets).toHaveLength(expected.length);
  sheets.forEach((sheet, index) => {
    const articles = [...sheet.querySelectorAll("article")];
    expect(articles.map(article => article.querySelector("header span")!.textContent)).toEqual(
      expected[index].map(id => `#${String(id).padStart(3, "0")}`),
    );
    articles.forEach((article, offset) => {
      expect(within(article).getByText("Family night")).toBeInTheDocument();
      expect(article.querySelector("footer")).toHaveTextContent("90-ball bingo · One line, then full house");
      const values = [...article.querySelectorAll("article > div > span")].map(cell => cell.textContent === "" ? null : Number(cell.textContent));
      expect(values).toEqual(cards[expected[index][offset] - 1].numbers);
      expect(values).toHaveLength(27);
    });
  });
});

it("previews only the first sheet and keeps empty previews available", () => {
  const { container, rerender } = render(<PrintedSheets {...props} preview />);
  expect(container.querySelectorAll("article")).toHaveLength(4);
  expect(container).toHaveTextContent("#004");
  expect(container).not.toHaveTextContent("#005");
  expect(container.querySelector("style")).toBeNull();
  rerender(<PrintedSheets {...props} cards={[]} preview />);
  expect(container.querySelector(".bingo-flow-sheet-frame")).toBeInTheDocument();
  expect(container.querySelectorAll("article")).toHaveLength(0);
  rerender(<PrintedSheets {...props} cards={[]} />);
  expect(container).toBeEmptyDOMElement();
});

it("falls back to four cards for an unsupported saved layout", () => {
  const { container } = render(<PrintedSheets {...props} cardsPerPage={99} />);
  expect(container.querySelector("section")!.querySelectorAll("article")).toHaveLength(4);
});

it.each(Object.values(PRESET_THEMES))("binds the $name theme in both rendering modes", theme => {
  const { container, rerender } = render(<PrintedSheets {...props} theme={theme} />);
  const printStyle = container.querySelector<HTMLElement>(".bingo-flow-print-only")!.style.cssText;
  expect(printStyle).toContain(`--bingo-card-background: ${theme.backgroundColor}`);
  expect(printStyle).toContain(`--bingo-card-font: ${theme.fontFamily}`);
  expect(container.querySelector("style")).toHaveTextContent("size: 210mm 297mm; margin: 12mm");
  rerender(<PrintedSheets {...props} theme={theme} preview />);
  expect(container.querySelector<HTMLElement>(".bingo-flow-sheet-frame")!.style.cssText).toBe(printStyle);
});

it('shares customized ink-saving, logo, readable numbers and footer between preview and paper', () => {
  const printOptions = { inkSaving: true, largeNumbers: true, borders: 'square' as const, footer: '  Thank you for joining us.  ', logo: 'data:image/png;base64,aGVsbG8=' };
  const { container, rerender } = render(<PrintedSheets {...props} printOptions={printOptions} preview />);
  const preview = container.querySelector<HTMLElement>('.bingo-flow-sheet-frame')!;
  expect(preview.style.getPropertyValue('--bingo-accent')).toBe('#fff');
  expect(preview.style.getPropertyValue('--bingo-accent-text')).toBe('#171717');
  expect(preview.style.getPropertyValue('--bingo-card-background')).toBe('#fff');
  expect(preview.style.getPropertyValue('--bingo-card-border')).toBe('#777');
  expect(preview.style.getPropertyValue('--bingo-card-border-width')).toBe('1px');
  expect(preview.style.getPropertyValue('--bingo-card-radius')).toBe('0');
  expect(preview.style.getPropertyValue('--bingo-number-size')).toBe('8em');
  expect(preview.style.getPropertyValue('--bingo-card-padding')).toBe('0');
  expect(container.querySelectorAll('img')).toHaveLength(4);
  expect(container.querySelector('img')).toHaveAttribute('src', printOptions.logo);
  expect(container.querySelector('footer')).toHaveTextContent('Thank you for joining us.');
  expect(container.querySelectorAll('.is-ink-saving')).toHaveLength(4);
  const expectedStyle = preview.style.cssText;
  rerender(<PrintedSheets {...props} printOptions={printOptions} />);
  expect(container.querySelector<HTMLElement>('.bingo-flow-print-only')!.style.cssText).toBe(expectedStyle);
  expect(container.querySelectorAll('img')).toHaveLength(9);
  expect(container.querySelector('header span')).toHaveTextContent('#001');
});
it('supports borderless cards without changing their numbers or numbering', () => {
  const { container } = render(<PrintedSheets {...props} printOptions={{ inkSaving: true, largeNumbers: false, borders: 'none', footer: '', logo: '' }} preview />);
  expect(container.querySelector<HTMLElement>('.bingo-flow-sheet-frame')!.style.getPropertyValue('--bingo-card-border-width')).toBe('0px');
  expect(container.querySelector('header span')).toHaveTextContent('#001');
  expect(container.querySelectorAll('.bingo-flow-card > div > span')).toHaveLength(108);
});
