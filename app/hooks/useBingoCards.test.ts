import { act, renderHook } from '@testing-library/react';
import { useBingoCards } from './useBingoCards';
import { createSeededRandom, parseBingoCards } from '../utils/utils';

afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
it('generates actual cards after yielding to the UI and notifies the caller', () => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-11-06T12:00:00Z'));
  jest.spyOn(Math, 'random').mockImplementation(createSeededRandom(123));
  const { result } = renderHook(useBingoCards);
  const completed = jest.fn();
  expect(result.current.bingoCards).toBeNull();
  act(() => result.current.generateCards(2, 'Evening', completed));
  expect(result.current.isGenerating).toBe(true); expect(completed).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(49)); expect(result.current.bingoCards).toBeNull();
  act(() => jest.advanceTimersByTime(1));
  expect(result.current.isGenerating).toBe(false);
  expect(result.current.bingoCards!.filename).toContain('Evening');
  expect(result.current.bingoCards!.cards).toHaveLength(2);
  for (const card of result.current.bingoCards!.cards) {
    expect(card.numbers).toHaveLength(27);
    expect(card.numbers.filter(number => number !== null)).toHaveLength(15);
  }
  expect(completed).toHaveBeenCalledWith(result.current.bingoCards);
  act(() => result.current.clearCards()); expect(result.current.bingoCards).toBeNull();
  act(() => { result.current.generateCards(0, 'Empty'); jest.advanceTimersByTime(50); });
  expect(result.current.bingoCards!.cards).toEqual([]);
});
it('imports cards and exports a readable round-trip download with the requested filename', async () => {
  const { result } = renderHook(useBingoCards);
  URL.createObjectURL = jest.fn(() => 'blob:cards');
  let filename = '';
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { filename = this.download; expect(this.href).toBe('blob:cards'); });
  act(() => result.current.exportBingoGame('Before importing'));
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  const content = '|CardNo.1;' + Array.from({ length: 27 }, (_, i) => i % 2 ? '' : i + 1).join(';');
  let imported: ReturnType<typeof parseBingoCards>;
  act(() => { imported = result.current.parseCardsFromFile('Original', content); });
  expect(result.current.bingoCards).toBe(imported!);
  act(() => result.current.exportBingoGame('Evening'));
  expect(filename).toMatch(/^Evening-.*\.bingoCards$/);
  const blob = jest.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
  expect(blob.type).toBe('text/plain;charset=utf-8');
  const exported = await new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(blob); });
  expect(parseBingoCards('Original', exported)).toEqual(imported!);
  expect(document.querySelector('a[download]')).toBeNull();
});
