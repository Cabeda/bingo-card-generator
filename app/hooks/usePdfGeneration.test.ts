import { act, renderHook, waitFor } from '@testing-library/react';
import { usePdfGeneration } from './usePdfGeneration';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';

// Mock jsPDF
jest.mock('jspdf');

// Mock html-to-image
jest.mock('html-to-image');

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document methods
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();

// Store original createElement
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
});
// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  cb(0);
  return 0;
});

describe('usePdfGeneration', () => {
  let mockPdfInstance: {
    internal: {
      pageSize: {
        getWidth: jest.Mock;
        getHeight: jest.Mock;
      };
    };
    addPage: jest.Mock;
    text: jest.Mock;
    addImage: jest.Mock;
    output: jest.Mock;
  };
  let container: HTMLDivElement;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create container for renderHook
    container = document.createElement('div');
    document.body.appendChild(container);

    // Setup mock PDF instance
    mockPdfInstance = {
      internal: {
        pageSize: {
          getWidth: jest.fn(() => 595),
          getHeight: jest.fn(() => 842),
        },
      },
      addPage: jest.fn(),
      text: jest.fn(),
      addImage: jest.fn(),
      output: jest.fn(() => new Blob(['mock pdf'], { type: 'application/pdf' })),
    };

    (jsPDF as jest.MockedClass<typeof jsPDF>).mockImplementation(() => mockPdfInstance as unknown as jsPDF);
    (htmlToImage.toPng as jest.Mock).mockResolvedValue('data:image/png;base64,mockimage');

    // Reset performance.now for consistent timing
    jest.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
        onSuccess
      );
    });

    expect(result.current.isGeneratingPDF).toBe(false);
    expect(onError).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('should generate PDF successfully with one card', async () => {
    const { result } = renderHook(() => usePdfGeneration(), { container });
    
    const mockGame = {
      filename: 'test',
      cards: [
        {
          cardTitle: '1',
          cardNumber: 1,
          numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
        },
      ],
    };

    // Setup card ref
    const mockElement = {
      offsetWidth: 400,
      offsetHeight: 300,
    } as HTMLDivElement;

    act(() => {
      const setRef = result.current.setCardRef(0);
      setRef(mockElement);
    });

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
        onSuccess
      );
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    expect(onError).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(htmlToImage.toPng).toHaveBeenCalled();
    expect(mockPdfInstance.addImage).toHaveBeenCalled();
    expect(mockPdfInstance.text).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
  });

  it('should handle cancellation during batch processing', async () => {
    const { result } = renderHook(() => usePdfGeneration(), { container });
    
    const mockGame = {
      filename: 'test',
      cards: Array.from({ length: 100 }, (_, i) => ({
        cardTitle: `${i + 1}`,
        cardNumber: i + 1,
        numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
      })),
    };

    // Setup card refs
    for (let i = 0; i < 100; i++) {
      const mockElement = {
        offsetWidth: 400,
        offsetHeight: 300,
      } as HTMLDivElement;
      act(() => {
        const setRef = result.current.setCardRef(i);
        setRef(mockElement);
      });
    }

    const onError = jest.fn();
    const onCancel = jest.fn();
    const onSuccess = jest.fn();

    // Start PDF generation
    const generatePromise = act(async () => {
      return result.current.generatePDF(
        mockGame,
        'Test Event',
        'Test Location',
        2,
        onError,
        onCancel,
        onSuccess
      );
    });

    // Cancel immediately
    act(() => {
      result.current.cancelPdfGeneration();
    });

    await generatePromise;

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledWith('pdfCancelled');
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('should handle errors during PDF generation', async () => {
    const { result } = renderHook(() => usePdfGeneration(), { container });
    
    const mockGame = {
      filename: 'test',
      cards: [
        {
          cardTitle: '1',
          cardNumber: 1,
          numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
        },
      ],
    };

    // Setup card ref
    const mockElement = {
      offsetWidth: 400,
      offsetHeight: 300,
    } as HTMLDivElement;

    act(() => {
      const setRef = result.current.setCardRef(0);
      setRef(mockElement);
    });

    // Make htmlToImage.toPng throw an error
    (htmlToImage.toPng as jest.Mock).mockRejectedValueOnce(new Error('Image conversion failed'));

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
        onSuccess
      );
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('errorGeneratingPdf');
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('should handle multiple cards per page', async () => {
    const { result } = renderHook(() => usePdfGeneration(), { container });
    
    const mockGame = {
      filename: 'test',
      cards: [
        {
          cardTitle: '1',
          cardNumber: 1,
          numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
        },
        {
          cardTitle: '2',
          cardNumber: 2,
          numbers: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, null, null, null, null, null, null, null, null, null, null, null, null],
        },
      ],
    };

    // Setup card refs
    for (let i = 0; i < 2; i++) {
      const mockElement = {
        offsetWidth: 400,
        offsetHeight: 300,
      } as HTMLDivElement;
      act(() => {
        const setRef = result.current.setCardRef(i);
        setRef(mockElement);
      });
    }

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
        onSuccess
      );
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    // Should not add extra pages since we have 2 cards and 2 per page
    expect(mockPdfInstance.addPage).not.toHaveBeenCalled();
  });

  it('should add new page for additional cards', async () => {
    const { result } = renderHook(() => usePdfGeneration(), { container });
    
    const mockGame = {
      filename: 'test',
      cards: [
        {
          cardTitle: '1',
          cardNumber: 1,
          numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
        },
        {
          cardTitle: '2',
          cardNumber: 2,
          numbers: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, null, null, null, null, null, null, null, null, null, null, null, null],
        },
        {
          cardTitle: '3',
          cardNumber: 3,
          numbers: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, null, null, null, null, null, null, null, null, null, null, null, null],
        },
      ],
    };

    // Setup card refs
    for (let i = 0; i < 3; i++) {
      const mockElement = {
        offsetWidth: 400,
        offsetHeight: 300,
      } as HTMLDivElement;
      act(() => {
        const setRef = result.current.setCardRef(i);
        setRef(mockElement);
      });
    }

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
        onSuccess
      );
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    // Should add one page for the third card (2 cards per page)
    expect(mockPdfInstance.addPage).toHaveBeenCalledTimes(1);
  });

  it('should use fast quality mode settings', async () => {
    const { result } = renderHook(() => usePdfGeneration(), { container });
    
    act(() => {
      result.current.setQualityMode('fast');
    });

    const mockGame = {
      filename: 'test',
      cards: [
        {
          cardTitle: '1',
          cardNumber: 1,
          numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
        },
      ],
    };

    const mockElement = {
      offsetWidth: 400,
      offsetHeight: 300,
    } as HTMLDivElement;

    act(() => {
      const setRef = result.current.setCardRef(0);
      setRef(mockElement);
    });

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
        onSuccess
      );
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    // Verify toPng was called with fast quality settings
    expect(htmlToImage.toPng).toHaveBeenCalledWith(
      mockElement,
      expect.objectContaining({
        quality: 0.5,
        pixelRatio: 1,
      })
    );
  });

  it('should use high quality mode settings', async () => {
    const { result } = renderHook(() => usePdfGeneration(), { container });
    
    act(() => {
      result.current.setQualityMode('high');
    });

    const mockGame = {
      filename: 'test',
      cards: [
        {
          cardTitle: '1',
          cardNumber: 1,
          numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
        },
      ],
    };

    const mockElement = {
      offsetWidth: 400,
      offsetHeight: 300,
    } as HTMLDivElement;

    act(() => {
      const setRef = result.current.setCardRef(0);
      setRef(mockElement);
    });

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
        onSuccess
      );
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    // Verify toPng was called with high quality settings
    expect(htmlToImage.toPng).toHaveBeenCalledWith(
      mockElement,
      expect.objectContaining({
        quality: 0.95,
        pixelRatio: 2,
      })
    );
  });

  it('should handle missing card ref gracefully', async () => {
    const { result } = renderHook(() => usePdfGeneration(), { container });
    
    const mockGame = {
      filename: 'test',
      cards: [
        {
          cardTitle: '1',
          cardNumber: 1,
          numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
        },
      ],
    };

    // Don't set card ref - leave it null
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

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
        onSuccess
      );
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    // Should have warned about null ref
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('ref is null'));
    consoleWarnSpy.mockRestore();
  });

  it('should track progress during PDF generation', async () => {
    const { result } = renderHook(() => usePdfGeneration(), { container });
    
    const mockGame = {
      filename: 'test',
      cards: Array.from({ length: 10 }, (_, i) => ({
        cardTitle: `${i + 1}`,
        cardNumber: i + 1,
        numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
      })),
    };

    // Setup card refs
    for (let i = 0; i < 10; i++) {
      const mockElement = {
        offsetWidth: 400,
        offsetHeight: 300,
      } as HTMLDivElement;
      act(() => {
        const setRef = result.current.setCardRef(i);
        setRef(mockElement);
      });
    }

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
        onSuccess
      );
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    // Progress should have reached 100
    await waitFor(() => {
      expect(result.current.progress).toBe(100);
    });
  });

  it('should reset state after successful PDF generation', async () => {
    const { result } = renderHook(() => usePdfGeneration(), { container });
    
    const mockGame = {
      filename: 'test',
      cards: [
        {
          cardTitle: '1',
          cardNumber: 1,
          numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
        },
      ],
    };

    const mockElement = {
      offsetWidth: 400,
      offsetHeight: 300,
    } as HTMLDivElement;

    act(() => {
      const setRef = result.current.setCardRef(0);
      setRef(mockElement);
    });

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
        onSuccess
      );
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    // Wait for the setTimeout to complete (1000ms delay)
    await new Promise(resolve => setTimeout(resolve, 1100));

    // State should be reset after timeout
    await waitFor(() => {
      expect(result.current.isGeneratingPDF).toBe(false);
      expect(result.current.progress).toBe(0);
    });
  });
});
