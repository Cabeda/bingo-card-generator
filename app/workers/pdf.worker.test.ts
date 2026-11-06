import { buildPdf } from '../utils/pdf/vectorPdf';
import { PdfWorkerRequest } from './pdf.worker';

jest.mock('../utils/pdf/vectorPdf', () => ({ buildPdf: jest.fn() }));
const mockBuildPdf = jest.mocked(buildPdf);
const request = { cards: [{ cardTitle: '1', cardNumber: 1, numbers: [1, null, 3] }], header: 'Evening', footer: 'Hall', cardsPerPage: 2, theme: { id: 'classic' } } as unknown as PdfWorkerRequest;
let originalPostMessage: typeof self.postMessage;
let originalOnMessage: typeof self.onmessage;
let postMessage: jest.Mock;

beforeAll(() => {
  originalPostMessage = self.postMessage;
  originalOnMessage = self.onmessage;
  require('./pdf.worker');
});
beforeEach(() => {
  postMessage = jest.fn();
  self.postMessage = postMessage;
  mockBuildPdf.mockReset();
});
afterAll(() => { self.postMessage = originalPostMessage; self.onmessage = originalOnMessage; });
function send(data: unknown) { self.onmessage!({ data } as MessageEvent); }

it('builds the supplied document and publishes progress before completion', () => {
  const blob = new Blob(['pdf']);
  mockBuildPdf.mockImplementation((options) => { options.onProgress!(55); return blob; });
  send(request);
  expect(mockBuildPdf).toHaveBeenCalledWith({ ...request, onProgress: expect.any(Function) });
  expect(postMessage.mock.calls).toEqual([[{ type: 'progress', progress: 55 }], [{ type: 'done', blob }]]);
});

it('ignores best-effort cancellation messages without starting another build', () => {
  send({ type: 'cancel' });
  expect(mockBuildPdf).not.toHaveBeenCalled();
  expect(postMessage).not.toHaveBeenCalled();
});

it.each([new Error('PDF failure'), 'string failure', new Error('__cancelled__')])('reports build failures (%s)', (failure) => {
  mockBuildPdf.mockImplementation(() => { throw failure; });
  send(request);
  const message = failure instanceof Error ? failure.message : failure;
  expect(postMessage).toHaveBeenCalledWith(message === '__cancelled__' ? { type: 'cancelled' } : { type: 'error', message });
});

it('reports malformed requests instead of crashing the worker', () => {
  send(null);
  expect(mockBuildPdf).not.toHaveBeenCalled();
  expect(postMessage).toHaveBeenCalledWith({ type: 'error', message: expect.stringContaining('cards') });
});
