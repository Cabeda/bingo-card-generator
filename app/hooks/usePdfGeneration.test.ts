import { act, renderHook } from '@testing-library/react';
import { usePdfGeneration } from './usePdfGeneration';
import { buildPdf } from '../utils/pdf/vectorPdf';
import { runWorkerPdf } from '../utils/pdf/workerBridge';
import { PRESET_THEMES } from '../utils/themes';
import { Game } from '../utils/bingo.interface';

jest.mock('../components/ThemeProvider', () => ({ useCardTheme: () => ({ currentTheme: PRESET_THEMES.classic }) }));
jest.mock('../utils/pdf/vectorPdf', () => ({ buildPdf: jest.fn() }));
jest.mock('../utils/pdf/workerBridge', () => ({ runWorkerPdf: jest.fn() }));
const direct = jest.mocked(buildPdf);
const worker = jest.mocked(runWorkerPdf);
const game = { filename: 'test', cards: [] } as unknown as Game;
const blob = new Blob(['PDF'], { type: 'application/pdf' });
const originalWorker = globalThis.Worker;
const originalId = process.env.JEST_WORKER_ID;

beforeEach(() => {
  jest.useFakeTimers();
  direct.mockReset().mockReturnValue(blob);
  worker.mockReset().mockResolvedValue(blob);
  URL.createObjectURL = jest.fn(() => 'blob:pdf');
  URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  Object.defineProperty(globalThis, 'Worker', { configurable: true, writable: true, value: undefined });
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  globalThis.Worker = originalWorker;
  if (originalId === undefined) delete process.env.JEST_WORKER_ID;
  else process.env.JEST_WORKER_ID = originalId;
});
function setup() {
  const hook = renderHook(() => usePdfGeneration());
  const error = jest.fn(), cancel = jest.fn(), success = jest.fn();
  const generate = (cards: Game | null = game) => hook.result.current.generatePDF(cards, 'Event', 'Place', 2, error, cancel, success);
  return { ...hook, error, cancel, success, generate };
}
function enableWorker() {
  globalThis.Worker = jest.fn() as unknown as typeof Worker;
  delete process.env.JEST_WORKER_ID;
}
it('exposes defaults, updates quality and attaches or clears card refs', () => {
  const { result } = setup();
  expect(result.current).toMatchObject({ isGeneratingPDF: false, progress: 0, estimatedTimeRemaining: 0, batchInfo: '', qualityMode: 'balanced' });
  const element = document.createElement('div');
  act(() => { result.current.setQualityMode('high'); result.current.setCardRef(2)(element); });
  expect(result.current.qualityMode).toBe('high');
  expect(result.current.cardRefs.current[2]).toBe(element);
  act(() => result.current.setCardRef(2)(null));
  expect(result.current.cardRefs.current[2]).toBeNull();
});
it('ignores missing games without starting work', async () => {
  const h = setup();
  await act(async () => h.generate(null));
  expect(direct).not.toHaveBeenCalled();
  expect(h.success).not.toHaveBeenCalled();
  expect(h.result.current.isGeneratingPDF).toBe(false);
});
it.each([false, true])('downloads and resets after successful generation (worker %s)', async (useWorker) => {
  if (useWorker) enableWorker();
  const h = setup();
  direct.mockImplementation(options => { options.onProgress!(45); expect(options.isCancelled!()).toBe(false); return blob; });
  worker.mockImplementation(async (...args) => { args[5](45); expect(args[6]()).toBe(false); return blob; });
  await act(async () => h.generate());
  expect(h.success).toHaveBeenCalledTimes(1);
  expect(h.error).not.toHaveBeenCalled();
  expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pdf');
  expect(document.querySelector('a[download]')).toBeNull();
  expect(h.result.current.progress).toBe(100);
  expect(h.result.current.isGeneratingPDF).toBe(true);
  act(() => jest.advanceTimersByTime(300));
  expect(h.result.current).toMatchObject({ progress: 0, isGeneratingPDF: false, estimatedTimeRemaining: 0, batchInfo: '' });
});
it.each([false, true])('cancels a completed result without downloading (worker %s)', async useWorker => {
  if (useWorker) enableWorker();
  const h = setup();
  direct.mockImplementation(options => { h.result.current.cancelPdfGeneration(); expect(options.isCancelled!()).toBe(true); return blob; });
  worker.mockImplementation(async (...args) => { h.result.current.cancelPdfGeneration(); expect(args[6]()).toBe(true); return blob; });
  await act(async () => h.generate());
  expect(h.cancel).toHaveBeenCalledWith('pdfCancelled');
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(h.result.current).toMatchObject({ isGeneratingPDF: false, progress: 0 });
});
it.each([false, true])('handles cancellation exceptions without fallback or errors (worker %s)', async useWorker => {
  if (useWorker) enableWorker();
  direct.mockImplementation(() => { throw new Error('__cancelled__'); });
  worker.mockRejectedValue(new Error('__cancelled__'));
  const h = setup();
  await act(async () => h.generate());
  expect(h.cancel).toHaveBeenCalledWith('pdfCancelled');
  expect(h.error).not.toHaveBeenCalled();
  expect(h.result.current.isGeneratingPDF).toBe(false);
  if (useWorker) expect(direct).not.toHaveBeenCalled();
});
it.each([new Error('broken'), 'broken'])('reports direct errors and restores idle state: %s', async failure => {
  direct.mockImplementation(() => { throw failure; });
  const h = setup();
  await act(async () => h.generate());
  expect(h.error).toHaveBeenCalledWith('errorGeneratingPdf');
  expect(h.result.current).toMatchObject({ progress: 0, isGeneratingPDF: false, batchInfo: '', estimatedTimeRemaining: 0 });
});
it.each([new Error('worker unavailable'), 'worker unavailable'])('falls back to direct rendering after worker failures: %s', async failure => {
  enableWorker();
  worker.mockRejectedValue(failure);
  const h = setup();
  await act(async () => h.generate());
  expect(direct).toHaveBeenCalledTimes(1);
  expect(h.success).toHaveBeenCalledTimes(1);
  expect(h.error).not.toHaveBeenCalled();
});
it('uses direct rendering when Jest identifies its worker environment', async () => {
  enableWorker();
  process.env.JEST_WORKER_ID = '1';
  const h = setup();
  await act(async () => h.generate());
  expect(worker).not.toHaveBeenCalled();
  expect(direct).toHaveBeenCalledTimes(1);
});
