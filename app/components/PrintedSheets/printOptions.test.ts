import { DEFAULT_PRINT_OPTIONS, normalizePrintOptions } from './printOptions';

it.each([undefined, null, false, 1, 'options', [], {}])('defaults absent or malformed preferences: %p', input => {
  expect(normalizePrintOptions(input)).toEqual(DEFAULT_PRINT_OPTIONS);
});
it('normalizes saved controls and bounds footer text', () => {
  expect(normalizePrintOptions({ inkSaving: true, largeNumbers: true, footer: `  ${'x'.repeat(110)}  `, borders: 'square' })).toEqual({
    ...DEFAULT_PRINT_OPTIONS, inkSaving: true, largeNumbers: true, footer: 'x'.repeat(100), borders: 'square',
  });
  expect(normalizePrintOptions({ inkSaving: 'yes', largeNumbers: 1, footer: 2, borders: 'missing' })).toEqual(DEFAULT_PRINT_OPTIONS);
  expect(normalizePrintOptions({ borders: 'none' }).borders).toBe('none');
  expect(normalizePrintOptions({ largeNumbers: false }).largeNumbers).toBe(false);
});
it.each(['png', 'jpeg', 'webp'])('accepts a local %s logo', format => {
  const logo = `data:image/${format};base64,aGVsbG8=`;
  expect(normalizePrintOptions({ logo }).logo).toBe(logo);
});
it.each([1, '', 'https://example.com/logo.png', 'data:image/svg+xml;base64,aGVsbG8=', 'data:image/png;base64,<html>', `data:image/png;base64,${'A'.repeat(1_500_000)}`])('rejects unsafe, malformed or oversized logos: %#', logo => {
  expect(normalizePrintOptions({ logo }).logo).toBe('');
});
