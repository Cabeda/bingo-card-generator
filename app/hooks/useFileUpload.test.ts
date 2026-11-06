import { act, renderHook, waitFor } from '@testing-library/react';
import { useFileUpload } from './useFileUpload';
const eventFor = (files: File[] | null) => ({ target: { files } }) as unknown as React.ChangeEvent<HTMLInputElement>;
function setup(read = jest.fn(() => ({ cards: [1, 2] }))) {
  const error = jest.fn(), success = jest.fn();
  return { ...renderHook(() => useFileUpload(read, error, success)), read, error, success };
}
afterEach(() => jest.restoreAllMocks());
it('reads a bingoCards file and reports parsed count', async () => {
  const h = setup(); const file = new File(['|CardNo.1;1;2'], 'Evening.bingoCards');
  expect(h.result.current.file).toBeNull();
  act(() => h.result.current.handleFileChange(eventFor([file])));
  expect(h.result.current.file).toBe(file);
  await waitFor(() => expect(h.success).toHaveBeenCalledWith(2));
  expect(h.read).toHaveBeenCalledWith('Evening', '|CardNo.1;1;2');
  expect(h.error).not.toHaveBeenCalled();
  act(() => h.result.current.setFile(null)); expect(h.result.current.file).toBeNull();
});
it.each([null, [], [new File(['bad'], 'wrong.txt')]])('rejects unsupported or missing files: %s', files => {
  const h = setup(); act(() => h.result.current.handleFileChange(eventFor(files)));
  expect(h.error).toHaveBeenCalledWith('uploadError'); expect(h.read).not.toHaveBeenCalled(); expect(h.result.current.file).toBeNull();
});
it.each([null, {}, { cards: [] }])('does not report success for missing parsed games or cards: %s', game => {
  const read = jest.fn(() => game) as unknown as jest.Mock<{ cards: number[] }>;
  const h = setup(read);
  jest.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (this: FileReader) {
    this.onload!({ target: { result: 'contents' } } as unknown as ProgressEvent<FileReader>);
  });
  act(() => h.result.current.handleFileChange(eventFor([new File(['contents'], 'test.bingoCards')])));
  expect(read).toHaveBeenCalledWith('test', 'contents');
  if (game && 'cards' in game) expect(h.success).toHaveBeenCalledWith(0);
  else expect(h.success).not.toHaveBeenCalled();
});
it('passes an absent reader result through to the parser without inventing content', () => {
  const h = setup();
  jest.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (this: FileReader) {
    this.onload!({ target: null } as ProgressEvent<FileReader>);
  });
  act(() => h.result.current.handleFileChange(eventFor([new File([], 'empty.bingoCards')])));
  expect(h.read).toHaveBeenCalledWith('empty', undefined);
});
