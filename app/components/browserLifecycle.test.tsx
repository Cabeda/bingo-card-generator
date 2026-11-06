import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { ThemeToggle } from './ThemeToggle';
import ViewTransition from './ViewTransition';
import { LanguageSelector } from './LanguageSelector';
const replace = jest.fn();
jest.mock('next-intl', () => ({ useLocale: () => 'en' }));
jest.mock('../routing', () => ({ routing: { locales: ['en', 'pt', 'es', 'fr'] }, usePathname: () => '/cards', useRouter: () => ({ replace }) }));
const originalEnv = process.env.NODE_ENV;
const swDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
beforeEach(() => { localStorage.clear(); replace.mockClear(); document.documentElement.removeAttribute('data-theme'); });
afterEach(() => {
  jest.useRealTimers(); jest.restoreAllMocks();
  Object.defineProperty(process.env, 'NODE_ENV', { configurable: true, writable: true, value: originalEnv });
  if (swDescriptor) Object.defineProperty(navigator, 'serviceWorker', swDescriptor);
  else Reflect.deleteProperty(navigator, 'serviceWorker');
  Reflect.deleteProperty(document, 'startViewTransition');
});
it('renders an inert initial theme toggle on the server', () => {
  const markup = renderToString(<ThemeToggle />);
  expect(markup).toContain('disabled=""'); expect(markup).toContain('aria-label="Toggle theme"');
});
it.each(['light', 'dark', 'system', 'invalid', null])('restores the stored theme or defaults to system: %s', stored => {
  if (stored !== null) localStorage.setItem('theme', stored);
  document.documentElement.setAttribute('data-theme', 'dark');
  render(<ThemeToggle />);
  expect(document.documentElement.getAttribute('data-theme')).toBe(stored === 'light' || stored === 'dark' ? stored : null);
  expect(screen.getByRole('button')).toBeEnabled();
});
it.each([
  ['system', 'Switch to light mode', '☀️', 'light'],
  ['light', 'Switch to dark mode', '🌙', 'dark'],
  ['dark', 'Switch to system mode', '🌓', 'system'],
])('describes the next appearance action from %s', (stored, label, icon, next) => {
  jest.useFakeTimers();
  localStorage.setItem('theme', stored);
  render(<ThemeToggle />);
  const button = screen.getByRole('button', { name: label });
  expect(button).toHaveAttribute('title', label);
  expect(button).toHaveTextContent(icon);
  fireEvent.click(button);
  expect(localStorage.getItem('theme')).toBe(next);
  act(() => jest.advanceTimersByTime(1000));
});
it('cycles themes, persists each selection and removes live announcements', () => {
  jest.useFakeTimers(); render(<ThemeToggle />);
  for (const theme of ['light', 'dark', 'system']) {
    fireEvent.click(screen.getByRole('button'));
    expect(localStorage.getItem('theme')).toBe(theme);
    expect(document.documentElement.getAttribute('data-theme')).toBe(theme === 'system' ? null : theme);
    expect(screen.getByRole('status')).toHaveTextContent(`Theme changed to ${theme} mode`);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    act(() => jest.advanceTimersByTime(1000));
    expect(screen.queryByRole('status')).toBeNull();
  }
});
it.each([false, true])('renders view-transition infrastructure without visible UI (native API %s)', supported => {
  if (supported) Object.defineProperty(document, 'startViewTransition', { configurable: true, value: jest.fn() });
  const { container } = render(<ViewTransition />);
  expect(container).toBeEmptyDOMElement();
});
it('renders locale options on the server and changes locale in the browser', () => {
  const markup = renderToString(<LanguageSelector />);
  expect(markup).toContain('value="pt"'); expect(replace).not.toHaveBeenCalled();
  render(<LanguageSelector />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Select language' }), { target: { value: 'pt' } });
  expect(localStorage.getItem('preferred-locale')).toBe('pt');
  expect(replace).toHaveBeenCalledWith('/cards', { locale: 'pt' });
});
