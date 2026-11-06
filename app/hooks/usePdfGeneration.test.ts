import { act, renderHook, waitFor } from '@testing-library/react';
import { usePdfGeneration } from './usePdfGeneration';
import { PRESET_THEMES } from '../utils/themes';
import { Game } from '../utils/bingo.interface';

jest.mock('../components/ThemeProvider', () => ({
  useCardTheme: () => ({ currentTheme: PRESET_THEMES.classic }),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();

const originalCreateElement = document.createElement.bind(document);

let createElementSpy: jest.SpyInstance;
let appendChildSpy: jest.SpyInstance;
let removeChildSpy: jest.SpyInstance;

beforeEach(() => {
  createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') {
      return {
        href: '',
        download: '',
        click: mockClick,
        style: {},
      } as unknown as HTMLAnchorElement;
    }
    return originalCreateElement(tag);
  });
  appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
  removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);
});

afterEach(() => {
  createElementSpy.mockRestore();
  appendChildSpy.mockRestore();
  removeChildSpy.mockRestore();
  jest.clearAllMocks();
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  cb(0);
  return 0;
});

const mockGame: Game = {
  filename: 'test' as Game['filename'],
  cards: [
    {
      cardTitle: '1' as Game['cards'][0]['cardTitle'],
      cardNumber: 1,
      numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
    },
  ],
};

describe('usePdfGeneration', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePdfGeneration(), { container });

    expect(result.current.isGeneratingPDF).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.estimatedTimeRemaining).toBe(0);
    expect(result.current.qualityMode).toBe('balanced');
    expect(result.current.cardRefs).toBeDefined();
    expect(result.current.setCardRef).toBeDefined();
    expect(result.current.generatePDF).toBeDefined();
    expect(result.current.cancelPdfGeneration).toBeDefined();
  });

  it('should update quality mode', () => {
    const { result } = renderHook(() => usePdfGeneration(), { container });

    act(() => {
      result.current.setQualityMode('high');
    });

    expect(result.current.qualityMode).toBe('high');

    act(() => {
      result.current.setQualityMode('fast');
    });

    expect(result.current.qualityMode).toBe('fast');
  });

  it('should set card ref correctly', () => {
    const { result } = renderHook(() => usePdfGeneration(), { container });
    const mockElement = document.createElement('div') as HTMLDivElement;

    act(() => {
      const setRef = result.current.setCardRef(0);
      setRef(mockElement);
    });

    expect(result.current.cardRefs.current[0]).toBe(mockElement);
  });

  it('should return early when bingoCards is null', async () => {
    const { result } = renderHook(() => usePdfGeneration(), { container });
    const onError = jest.fn();
    const onCancel = jest.fn();
    const onSuccess = jest.fn();

    await act(async () => {
      await result.current.generatePDF(
        null,
        'Test Event',
        'Test Location',
        2,
        onError,
        onCancel,
        onSuccess,
      );
    });

    expect(result.current.isGeneratingPDF).toBe(false);
    expect(onError).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('should generate PDF successfully with one card', async () => {
    const { result } = renderHook(() => usePdfGeneration(), { container });

    const onError = jest.fn();
    const onCancel = jest.fn();
    const onSuccess = jest.fn();

    await act(async () => {
      await result.current.generatePDF(
        mockGame,
        'Test Event',
        'Test Location',
        2,
        onError,
        onCancel,
        onSuccess,
      );
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalled(), { timeout: 2000 });
    expect(onError).not.toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
  });
});
