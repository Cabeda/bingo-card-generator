import { runWorkerPdf } from './workerBridge';
import { CardTheme, Game } from '../bingo.interface';

class BrowserWorker {
  static instances: BrowserWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = jest.fn();
  terminate = jest.fn();
  constructor(public url: URL) { BrowserWorker.instances.push(this); }
  receive(data: unknown) { this.onmessage!({ data } as MessageEvent); }
}

const game = { filename: 'event', cards: [{ cardTitle: '1', cardNumber: 1, numbers: [1, null, 3] }] } as Game;
const theme = { id: 'classic' } as unknown as CardTheme;
let originalWorker: typeof Worker;
beforeEach(() => {
  jest.useFakeTimers();
  originalWorker = global.Worker;
  global.Worker = BrowserWorker as unknown as typeof Worker;
  BrowserWorker.instances = [];
});
afterEach(() => { global.Worker = originalWorker; jest.useRealTimers(); });

function start(cancelled = () => false) {
  const progress = jest.fn();
  const result = runWorkerPdf(game, 'Evening', 'Hall', 2, theme, progress, cancelled);
  return { result, progress, worker: BrowserWorker.instances[0] };
}

it('sends the requested document, forwards progress, and resolves the finished blob', async () => {
  const { result, progress, worker } = start();
  expect(worker.url.pathname).toMatch(/app\/workers\/pdf.worker.ts$/);
  expect(worker.postMessage).toHaveBeenCalledWith({ cards: game.cards, header: 'Evening', footer: 'Hall', cardsPerPage: 2, theme });
  jest.advanceTimersByTime(50);
  expect(worker.postMessage).toHaveBeenCalledTimes(1);
  worker.receive({ type: 'progress', progress: 42 });
  expect(progress).toHaveBeenCalledWith(42);
  worker.receive({ type: 'unknown' });
  expect(worker.terminate).not.toHaveBeenCalled();
  const blob = new Blob(['pdf']);
  worker.receive({ type: 'done', blob });
  await expect(result).resolves.toBe(blob);
  expect(worker.terminate).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});

it('polls for cancellation until the worker acknowledges it', async () => {
  let cancelled = false;
  const { result, worker } = start(() => cancelled);
  const rejected = expect(result).rejects.toThrow('__cancelled__');
  jest.advanceTimersByTime(50);
  expect(worker.postMessage).toHaveBeenCalledTimes(1);
  cancelled = true;
  jest.advanceTimersByTime(50);
  expect(worker.postMessage).toHaveBeenLastCalledWith({ type: 'cancel' });
  worker.receive({ type: 'cancelled' });
  await rejected;
  expect(worker.terminate).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});

it.each(['PDF failed', ''])('rejects worker error messages (%s) and stops polling', async (message) => {
  const { result, worker } = start();
  const rejected = expect(result).rejects.toThrow(message || 'errorGeneratingPdf');
  worker.receive({ type: 'error', message });
  await rejected;
  expect(worker.terminate).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});

it('rejects native worker failures and terminates the worker', async () => {
  const { result, worker } = start();
  const rejected = expect(result).rejects.toThrow('worker_error');
  worker.onerror!();
  await rejected;
  expect(worker.terminate).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});

it.each([new Error('Worker unavailable'), 'Worker blocked'])('normalizes startup failures (%s)', async (failure) => {
  global.Worker = jest.fn(() => { throw failure; }) as unknown as typeof Worker;
  await expect(start().result).rejects.toThrow(failure instanceof Error ? failure.message : failure);
  expect(jest.getTimerCount()).toBe(0);
});
