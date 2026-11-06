import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { ThemeProvider, useCardTheme } from './ThemeProvider';
import { PRESET_THEMES } from '../utils/themes';
const wrapper = ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;
beforeEach(() => { localStorage.clear(); jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => jest.restoreAllMocks());
it('requires its provider', () => { expect(() => renderHook(useCardTheme)).toThrow('useCardTheme must be used within a ThemeProvider'); });
it('loads valid custom themes and ignores invalid entries', () => {
  localStorage.setItem('bingoCardThemes', JSON.stringify({ valid: PRESET_THEMES.dark, invalid: {} }));
  localStorage.setItem('selectedBingoTheme', 'valid');
  const { result } = renderHook(useCardTheme, { wrapper });
  expect(result.current.currentTheme).toEqual(PRESET_THEMES.dark);
  expect(Object.keys(result.current.customThemes)).toEqual(['valid']);
});
it.each(['42', '{broken', 'null'])('recovers from unsupported stored theme content: %s', stored => {
  localStorage.setItem('bingoCardThemes', stored);
  const { result } = renderHook(useCardTheme, { wrapper });
  expect(result.current.currentTheme).toEqual(PRESET_THEMES.classic);
});
it('selects presets and falls back for unknown keys while persisting selection', () => {
  const { result } = renderHook(useCardTheme, { wrapper });
  act(() => result.current.setTheme('modern'));
  expect(result.current.currentTheme).toEqual(PRESET_THEMES.modern);
  expect(localStorage.getItem('selectedBingoTheme')).toBe('modern');
  act(() => result.current.setTheme('missing'));
  expect(result.current.currentTheme).toEqual(PRESET_THEMES.classic);
});
it('imports, exports and deletes selected and unselected custom themes', () => {
  jest.spyOn(Date, 'now').mockReturnValueOnce(1).mockReturnValueOnce(2);
  const { result } = renderHook(useCardTheme, { wrapper });
  act(() => { expect(result.current.importTheme(JSON.stringify(PRESET_THEMES.dark))).toBe(true); });
  expect(JSON.parse(result.current.exportTheme(result.current.currentTheme))).toEqual(PRESET_THEMES.dark);
  act(() => result.current.setCustomTheme(PRESET_THEMES.kids));
  expect(result.current.selectedThemeKey).toBe('custom_2');
  act(() => result.current.deleteCustomTheme('custom_1'));
  expect(result.current.currentTheme).toEqual(PRESET_THEMES.kids);
  act(() => result.current.deleteCustomTheme('custom_2'));
  expect(result.current.selectedThemeKey).toBe('classic');
  expect(JSON.parse(localStorage.getItem('bingoCardThemes')!)).toEqual({});
  act(() => { expect(result.current.importTheme('{}')).toBe(false); expect(result.current.importTheme('{broken')).toBe(false); });
});
it('keeps theme management usable when storage reads or writes fail', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('read denied'); });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('write denied'); });
  const { result } = renderHook(useCardTheme, { wrapper });
  act(() => result.current.setTheme('dark'));
  expect(result.current.currentTheme).toEqual(PRESET_THEMES.dark);
  expect(console.error).toHaveBeenCalledWith('Failed to load themes from localStorage:', expect.any(Error));
  expect(console.error).toHaveBeenCalledWith('Failed to save themes to localStorage:', expect.any(Error));
  expect(console.error).toHaveBeenCalledWith('Failed to save theme selection:', expect.any(Error));
});
