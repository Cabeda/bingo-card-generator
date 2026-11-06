import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import messages from '../../../messages/en.json';
import { DEFAULT_PRINT_OPTIONS, MAX_LOGO_BYTES, PrintOptions } from './printOptions';
import { PrintPreferences } from './PrintPreferences';

jest.mock('next-intl', () => ({ useTranslations: () => (key: keyof typeof messages.printPreferences) => messages.printPreferences[key] }));
const logo = 'data:image/png;base64,aGVsbG8=';
const originalReader = globalThis.FileReader;
const originalImage = globalThis.Image;
let readers: FakeReader[];
let decode: jest.Mock;
class FakeReader {
  result: string | ArrayBuffer | null = logo;
  onload: (() => Promise<void>) | null = null;
  onerror: (() => void) | null = null;
  abort = jest.fn();
  readAsDataURL = jest.fn();
  constructor() { readers.push(this); }
}
const changed = jest.fn();
function Form({ initial = DEFAULT_PRINT_OPTIONS }: { initial?: Readonly<PrintOptions> }) {
  const [value, setValue] = useState<PrintOptions>(initial);
  return <PrintPreferences value={value} onChange={next => { changed(next); setValue(next); }} />;
}
function file(value = new File(['logo'], 'logo.png', { type: 'image/png' })) {
  fireEvent.change(screen.getByLabelText('Logo or image'), { target: { files: [value] } });
}
beforeEach(() => {
  readers = []; decode = jest.fn().mockResolvedValue(undefined); changed.mockReset();
  Object.defineProperty(globalThis, 'FileReader', { configurable: true, value: FakeReader });
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: class { src = ''; decode = decode; } });
});
afterEach(() => {
  Object.defineProperty(globalThis, 'FileReader', { configurable: true, value: originalReader });
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: originalImage });
});
it('updates the ink, number, border and footer controls without regenerating cards', () => {
  render(<Form />);
  fireEvent.click(screen.getByRole('checkbox', { name: /Save ink/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /Larger numbers/ }));
  fireEvent.change(screen.getByLabelText('Cell borders'), { target: { value: 'none' } });
  fireEvent.change(screen.getByLabelText('Footer text'), { target: { value: 'Community bingo ' } });
  expect(changed).toHaveBeenLastCalledWith({ ...DEFAULT_PRINT_OPTIONS, inkSaving: true, largeNumbers: false, borders: 'none', footer: 'Community bingo ' });
});
it.each([
  new File(['not an image'], 'image.svg', { type: 'image/svg+xml' }),
  new File([new Uint8Array(MAX_LOGO_BYTES + 1)], 'large.png', { type: 'image/png' }),
])('reports unsupported or oversized files', invalid => {
  render(<Form />); file(invalid);
  expect(screen.getByRole('alert')).toHaveTextContent('Choose a PNG, JPEG or WebP image up to 1 MB.');
  expect(readers).toHaveLength(0);
});
it.each([[], null])('keeps the previous settings when the file chooser is cancelled (%p)', files => {
  render(<Form />);
  fireEvent.change(screen.getByLabelText('Logo or image'), { target: { files } });
  expect(changed).not.toHaveBeenCalled();
  expect(screen.queryByRole('alert')).toBeNull();
});
it('loads a logo, preserves changes made while loading, and removes it', async () => {
  const view = render(<Form />); file();
  fireEvent.change(screen.getByLabelText('Footer text'), { target: { value: 'Friday bingo' } });
  await act(async () => { await readers[0].onload!(); });
  expect(changed).toHaveBeenLastCalledWith({ ...DEFAULT_PRINT_OPTIONS, footer: 'Friday bingo', logo });
  expect(screen.getByAltText('Selected card logo')).toHaveAttribute('src', logo);
  fireEvent.click(screen.getByRole('button', { name: 'Remove image' }));
  expect(changed).toHaveBeenLastCalledWith({ ...DEFAULT_PRINT_OPTIONS, footer: 'Friday bingo', logo: '' });
  expect(screen.queryByRole('img')).toBeNull();
  view.unmount();
});
it('removes an already saved logo without a pending upload', () => {
  render(<Form initial={{ ...DEFAULT_PRINT_OPTIONS, logo }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove image' }));
  expect(changed).toHaveBeenLastCalledWith(DEFAULT_PRINT_OPTIONS);
});
it.each(['reader failure', 'invalid result', 'decode failure', 'synchronous failure'])('reports %s without accepting a broken image', async failure => {
  render(<Form />);
  file();
  if (failure === 'reader failure') act(() => readers[0].onerror!());
  else if (failure === 'invalid result') { readers[0].result = null; await act(async () => { await readers[0].onload!(); }); }
  else if (failure === 'decode failure') { decode.mockRejectedValueOnce(new Error('not an image')); await act(async () => { await readers[0].onload!(); }); }
  else {
    // A subsequent FileReader may fail synchronously before reading begins.
    Object.defineProperty(globalThis, 'FileReader', { value: class extends FakeReader { readAsDataURL = () => { throw new Error('read failure'); }; } });
    file();
  }
  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(changed).not.toHaveBeenCalled();
});
it('ignores stale load and failure events after another file is chosen', async () => {
  render(<Form />); file(); const old = readers[0]; file();
  expect(old.abort).toHaveBeenCalledTimes(1);
  await act(async () => { await old.onload!(); old.onerror!(); await readers[1].onload!(); });
  expect(changed).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('alert')).toBeNull();
});
it.each([true, false])('ignores a decoding completion after removal (success=%s)', async success => {
  let resolve!: () => void; let reject!: (error: Error) => void;
  decode.mockReturnValueOnce(new Promise<void>((yes, no) => { resolve = yes; reject = no; }));
  render(<Form initial={{ ...DEFAULT_PRINT_OPTIONS, logo }} />); file();
  const pending = readers[0].onload!();
  fireEvent.click(screen.getByRole('button', { name: 'Remove image' }));
  await act(async () => { if (success) resolve(); else reject(new Error('old image')); await pending; });
  expect(changed).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('alert')).toBeNull();
});
it('aborts an unfinished image read on unmount', () => {
  const view = render(<Form />); file(); view.unmount();
  expect(readers[0].abort).toHaveBeenCalledTimes(1);
});

it('ignores an image decode that finishes after the print panel unmounts', async () => {
  let resolve!: () => void;
  decode.mockReturnValueOnce(new Promise<void>(yes => { resolve = yes; }));
  const view = render(<Form />); file();
  const pending = readers[0].onload!();
  view.unmount();
  await act(async () => { resolve(); await pending; });
  expect(changed).not.toHaveBeenCalled();
});
