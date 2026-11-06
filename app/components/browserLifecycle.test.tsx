import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { ThemeToggle } from './ThemeToggle';
import { PWARegister } from './PWARegister';
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
it('registers a production service worker and reports success', async () => {
  Object.defineProperty(process.env, 'NODE_ENV', { configurable: true, writable: true, value: 'production' });
  const registration = { scope: '/' };
  const register = jest.fn().mockResolvedValue(registration);
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } });
  jest.spyOn(console, 'log').mockImplementation(() => {});
  await act(async () => { render(<PWARegister />); });
  expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  expect(console.log).toHaveBeenCalledWith('Service Worker registered:', registration);
});
it('reports rejected service worker registration', async () => {
  Object.defineProperty(process.env, 'NODE_ENV', { configurable: true, writable: true, value: 'production' });
  const failure = new Error('registration denied');
  const register = jest.fn().mockRejectedValue(failure);
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await act(async () => { render(<PWARegister />); });
  expect(console.error).toHaveBeenCalledWith('Service Worker registration failed:', failure);
});
it('does not register service workers during development or without browser support', () => {
  const register = jest.fn();
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } });
  Object.defineProperty(process.env, 'NODE_ENV', { configurable: true, writable: true, value: 'development' });
  const first = render(<PWARegister />); expect(register).not.toHaveBeenCalled(); first.unmount();
  Reflect.deleteProperty(navigator, 'serviceWorker');
  Object.defineProperty(process.env, 'NODE_ENV', { configurable: true, writable: true, value: 'production' });
  expect(render(<PWARegister />).container).toBeEmptyDOMElement();
});
it('renders locale options on the server and changes locale in the browser', () => {
  const markup = renderToString(<LanguageSelector />);
  expect(markup).toContain('value="pt"'); expect(replace).not.toHaveBeenCalled();
  render(<LanguageSelector />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Select language' }), { target: { value: 'pt' } });
  expect(localStorage.getItem('preferred-locale')).toBe('pt');
  expect(replace).toHaveBeenCalledWith('/cards', { locale: 'pt' });
});
