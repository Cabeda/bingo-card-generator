import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { PWARegister } from './PWARegister';
import { prepareOffline } from '../utils/offline';

jest.mock('../utils/offline', () => ({ prepareOffline: jest.fn() }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
const prepare = jest.mocked(prepareOffline);
const originalEnv = process.env.NODE_ENV;
function deferred() {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function online(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
}
beforeEach(() => {
  Object.defineProperty(process.env, 'NODE_ENV', { configurable: true, value: 'production' });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {} });
  Object.defineProperty(window, 'caches', { configurable: true, value: {} });
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  online(true);
  prepare.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  Object.defineProperty(process.env, 'NODE_ENV', { configurable: true, value: originalEnv });
});

it('renders nothing on the server or in development', () => {
  expect(renderToString(<PWARegister />)).toBe('');
  Object.defineProperty(process.env, 'NODE_ENV', { value: 'development' });
  expect(render(<PWARegister />).container).toBeEmptyDOMElement();
  expect(prepare).not.toHaveBeenCalled();
});

it.each(['serviceWorker', 'caches'])('reports unsupported %s without preparing', key => {
  Reflect.deleteProperty(key === 'caches' ? window : navigator, key);
  render(<PWARegister />);
  expect(screen.getByRole('status')).toHaveTextContent('unavailable');
  expect(prepare).not.toHaveBeenCalled();
  expect(screen.queryByRole('button')).toBeNull();
});

it('prepares silently and shows no banner when ready', async () => {
  const pending = deferred(); prepare.mockReturnValue(pending.promise);
  const view = render(<PWARegister />);
  expect(view.container.querySelector('[data-offline-state]')).toHaveAttribute('data-offline-state', 'preparing');
  expect(screen.queryByRole('status')).toBeNull();
  await act(async () => pending.resolve());
  expect(screen.queryByRole('status')).toBeNull();
  expect(document.querySelector('[data-offline-state=ready]')).toHaveAttribute('hidden');
});

it('retries failures while online', async () => {
  prepare.mockRejectedValueOnce(new Error('cache missing'));
  await act(async () => { render(<PWARegister />); });
  expect(screen.getByRole('status')).toHaveTextContent('unavailable');
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'retry' })));
  expect(prepare).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('status')).toBeNull();
  expect(document.querySelector('[data-offline-state=ready]')).toHaveAttribute('hidden');
});

it('keeps verified readiness offline and rechecks on reconnect', async () => {
  await act(async () => { render(<PWARegister />); });
  online(false); fireEvent(window, new Event('offline'));
  expect(screen.queryByRole('status')).toBeNull();
  expect(prepare).toHaveBeenCalledTimes(1);
  online(true); await act(async () => fireEvent(window, new Event('online')));
  expect(prepare).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('status')).toBeNull();
  expect(document.querySelector('[data-offline-state=ready]')).toHaveAttribute('hidden');
});

it('does not offer an offline retry when preparation failed', async () => {
  online(false); prepare.mockRejectedValue(new Error('missing'));
  await act(async () => { render(<PWARegister />); });
  expect(screen.getByRole('status')).toHaveTextContent('unavailable');
  expect(screen.queryByRole('button')).toBeNull();
});

it('checks on becoming visible but not when hidden', async () => {
  await act(async () => { render(<PWARegister />); });
  Object.defineProperty(document, 'visibilityState', { value: 'hidden' });
  fireEvent(document, new Event('visibilitychange'));
  expect(prepare).toHaveBeenCalledTimes(1);
  Object.defineProperty(document, 'visibilityState', { value: 'visible' });
  await act(async () => fireEvent(document, new Event('visibilitychange')));
  expect(prepare).toHaveBeenCalledTimes(2);
});

it.each(['resolve', 'reject'] as const)('ignores stale attempt %s after a newer attempt', async outcome => {
  const old = deferred(); prepare.mockReturnValueOnce(old.promise);
  render(<PWARegister />);
  await act(async () => fireEvent(window, new Event('online')));
  await act(async () => { if (outcome === 'resolve') old.resolve(); else old.reject(new Error('stale')); });
  expect(screen.queryByRole('status')).toBeNull();
  expect(document.querySelector('[data-offline-state=ready]')).toHaveAttribute('hidden');
});

it.each(['resolve', 'reject'] as const)('ignores unmounted completion %s and removes listeners', async outcome => {
  const pending = deferred(); prepare.mockReturnValue(pending.promise);
  const view = render(<PWARegister />); view.unmount();
  fireEvent(window, new Event('online')); fireEvent(window, new Event('offline')); fireEvent(document, new Event('visibilitychange'));
  await act(async () => { if (outcome === 'resolve') pending.resolve(); else pending.reject(new Error('late')); });
  expect(prepare).toHaveBeenCalledTimes(1);
  expect(view.container).toBeEmptyDOMElement();
});
