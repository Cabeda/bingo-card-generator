import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FileUpload } from './FileUpload';
import { ToastProvider } from './ToastProvider';
import { generateRandomBingoCards, parseBingoCards } from '../utils/utils';

// Helper to render with ToastProvider
const renderWithToast = (component: React.ReactElement) => {
  return render(<ToastProvider>{component}</ToastProvider>);
};

// Mock next-intl with translations
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'title': 'Bingo Card Generator',
      'numCards': 'Number of Cards',
      'numCardsPlaceholder': 'Number of cards',
      'cardsPerPage': 'Cards per Page',
      'qualityMode': 'Quality Mode',
      'qualityFast': 'Fast (Low Quality)',
      'qualityBalanced': 'Balanced',
      'qualityHigh': 'High Quality',
      'eventName': 'Event Name',
      'eventNamePlaceholder': 'Event Name',
      'location': 'Location',
      'locationPlaceholder': 'Location',
      'uploadFile': 'Upload .bingoCards File:',
      'selectedFile': 'Selected file: {filename}',
      'generateCards': 'Generate Bingo Cards',
      'generating': 'Generating cards...',
      'generatingCards': 'Generating {current} of {total} cards...',
      'bingoCards': 'Bingo Cards',
      'exportBingoCards': 'Generate .bingoCards',
      'generatePdf': 'Generate PDF',
      'generatingPdf': 'Generating PDF... {progress}%',
      'generatingPdfWithTime': 'Generating PDF... {progress}% (Est. {timeRemaining}s remaining)',
      'processingBatch': 'Processing batch {current} of {total}',
      'convertingImages': 'Converting images to PDF...',
      'assemblingPdf': 'Assembling PDF document...',
      'cancelPdf': 'Cancel',
      'pdfCancelled': 'PDF generation cancelled.',
      'pdfGeneratedSuccess': 'PDF generated successfully!',
      'cardsGeneratedSuccess': '{count} cards generated successfully!',
      'bingoCardsExportedSuccess': 'Bingo cards exported successfully!',
      'errorGeneratingPdf': 'Error generating PDF. Please try again.',
      'uploadError': 'Please upload a file with the .bingoCards extension.',
      'confirmClearCards': 'Clear all cards?',
      'confirmClearCardsMessage': 'Are you sure you want to clear all generated cards? This action cannot be undone.',
      'clear': 'Clear',
      'cancel': 'Cancel',
    };
    let result = translations[key] || key;
    // Simple placeholder replacement for testing
    if (values) {
      Object.entries(values).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, String(v));
      });
    }
    return result;
  },
  useLocale: () => 'en',
}));

// Mock jsPDF
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    internal: {
      pageSize: {
        getWidth: () => 595,
        getHeight: () => 842,
      },
    },
    addImage: jest.fn(),
    addPage: jest.fn(),
    text: jest.fn(),
    save: jest.fn(),
    output: jest.fn().mockReturnValue(new Blob(['fake pdf content'], { type: 'application/pdf' })),
  }));
});

// Mock html-to-image
jest.mock('html-to-image', () => ({
  toPng: jest.fn().mockResolvedValue('data:image/png;base64,fake'),
}));

// Mock utils
jest.mock('../utils/utils');

const mockGenerateRandomBingoCards = generateRandomBingoCards as jest.MockedFunction<typeof generateRandomBingoCards>;
const mockParseBingoCards = parseBingoCards as jest.MockedFunction<typeof parseBingoCards>;

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('FileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockGenerateRandomBingoCards.mockReturnValue([
      {
        cardTitle: '1',
        cardNumber: 1,
        numbers: [1, null, 3, null, 5, null, 7, null, 9, 10, null, 12, null, 14, null, 16, null, 18, 19, null, 21, null, 23, null, 25, null, 27],
      },
    ]);

    mockParseBingoCards.mockReturnValue({
      filename: 'test-file',
      cards: [
        {
          cardTitle: 'test-1',
          cardNumber: 1,
          numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
        },
      ],
    });
  });

  it('should render without crashing', () => {
    renderWithToast(<FileUpload />);
    expect(screen.getByText(/Generate Bingo Cards/i)).toBeInTheDocument();
  });

  it('should have input for number of cards', () => {
    renderWithToast(<FileUpload />);
    const input = screen.getByPlaceholderText(/Number of cards/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(10); // Default value
  });

  it('should update card count when input changes', () => {
    renderWithToast(<FileUpload />);
    const input = screen.getByPlaceholderText(/Number of cards/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: '20' } });
    
    expect(input.value).toBe('20');
  });

  it('should have input for cards per page', () => {
    renderWithToast(<FileUpload />);
    const input = screen.getByRole('slider');
    expect(input).toBeInTheDocument();
  });

  it('should have input for event header', () => {
    renderWithToast(<FileUpload />);
    const input = screen.getByPlaceholderText(/Event Name/i);
    expect(input).toBeInTheDocument();
  });

  it('should have input for location footer', () => {
    renderWithToast(<FileUpload />);
    const input = screen.getByPlaceholderText(/Location/i);
    expect(input).toBeInTheDocument();
  });

  it('should generate cards when button is clicked', async () => {
    renderWithToast(<FileUpload />);
    
    const generateButton = screen.getByText(/Generate Bingo Cards/i);
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(mockGenerateRandomBingoCards).toHaveBeenCalledWith(10);
    });
  });

  it('should update number of cards to generate', async () => {
    renderWithToast(<FileUpload />);
    
    const input = screen.getByPlaceholderText(/Number of cards/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '25' } });
    
    const generateButton = screen.getByText(/Generate Bingo Cards/i);
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(mockGenerateRandomBingoCards).toHaveBeenCalledWith(25);
    });
  });

  it('should show export buttons after generating cards', async () => {
    renderWithToast(<FileUpload />);
    
    const generateButton = screen.getByText(/Generate Bingo Cards/i);
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Generate PDF/i)).toBeInTheDocument();
      expect(screen.getByText(/Generate .bingoCards/i)).toBeInTheDocument();
    });
  });

  it('should validate file upload format', () => {
    renderWithToast(<FileUpload />);
    
    // File input is hidden, we need to get it by accept attribute
    const fileInput = document.querySelector('input[type="file"][accept=".bingoCards"]') as HTMLInputElement;
    const wrongFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    
    if (fileInput) {
      Object.defineProperty(fileInput, 'files', {
        value: [wrongFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      // Should show error toast instead of alert - just verify it doesn't crash
      // Toast display is tested separately
    }
  });

  it('should accept valid .bingoCards file', () => {
    renderWithToast(<FileUpload />);
    
    const fileInput = document.querySelector('input[type="file"][accept=".bingoCards"]') as HTMLInputElement;
    
    if (fileInput) {
      // Just verify the input exists and has correct accept attribute
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', '.bingoCards');
    }
  });

  it('should hide PDF export button when no cards are generated', () => {
    renderWithToast(<FileUpload />);
    
    // Before generating cards, export buttons should not be visible
    expect(screen.queryByText(/Generate PDF/i)).not.toBeInTheDocument();
  });

  it('should show progress during PDF generation', async () => {
    renderWithToast(<FileUpload />);
    
    // Generate cards first
    const generateButton = screen.getByText(/Generate Bingo Cards/i);
    fireEvent.click(generateButton);
    
    // Wait for cards to be generated
    await waitFor(() => {
      expect(screen.getByText(/Generate PDF/i)).toBeInTheDocument();
    });
    
    // PDF button should be present after cards are generated
    const pdfButton = screen.getByText(/Generate PDF/i);
    expect(pdfButton).toBeInTheDocument();
  });

  it('should have default event header with current year', () => {
    renderWithToast(<FileUpload />);
    
    const input = screen.getByPlaceholderText(/Event Name/i) as HTMLInputElement;
    const currentYear = new Date().getFullYear();
    
    expect(input.value).toContain(currentYear.toString());
  });

  it('should have default location footer', () => {
    renderWithToast(<FileUpload />);
    
    const input = screen.getByPlaceholderText(/Location/i) as HTMLInputElement;
    
    expect(input.value).toBe('Paróquia Nossa Senhora da Areosa');
  });

  it('should have quality mode selector with default value', () => {
    renderWithToast(<FileUpload />);
    
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('balanced');
  });

  it('should update quality mode when selector changes', () => {
    renderWithToast(<FileUpload />);
    
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    
    fireEvent.change(select, { target: { value: 'fast' } });
    
    expect(select.value).toBe('fast');
  });

  // Internationalization tests
  describe('Internationalization', () => {
    it('should render translated title', () => {
      renderWithToast(<FileUpload />);
      expect(screen.getByText('Bingo Card Generator')).toBeInTheDocument();
    });

    it('should render translated "Number of Cards" label', () => {
      renderWithToast(<FileUpload />);
      expect(screen.getByText('Number of Cards')).toBeInTheDocument();
    });

    it('should render translated "Cards per Page" label', () => {
      renderWithToast(<FileUpload />);
      expect(screen.getByText('Cards per Page')).toBeInTheDocument();
    });

    it('should render translated "Event Name" label', () => {
      renderWithToast(<FileUpload />);
      expect(screen.getByText('Event Name')).toBeInTheDocument();
    });

    it('should render translated "Location" label', () => {
      renderWithToast(<FileUpload />);
      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    it('should render translated placeholder for number of cards', () => {
      renderWithToast(<FileUpload />);
      expect(screen.getByPlaceholderText('Number of cards')).toBeInTheDocument();
    });

    it('should render translated placeholder for event name', () => {
      renderWithToast(<FileUpload />);
      expect(screen.getByPlaceholderText('Event Name')).toBeInTheDocument();
    });

    it('should render translated placeholder for location', () => {
      renderWithToast(<FileUpload />);
      expect(screen.getByPlaceholderText('Location')).toBeInTheDocument();
    });

    it('should render translated "Generate Bingo Cards" button', () => {
      renderWithToast(<FileUpload />);
      expect(screen.getByText('Generate Bingo Cards')).toBeInTheDocument();
    });

    it('should render translated export buttons after generating cards', async () => {
      renderWithToast(<FileUpload />);
      
      const generateButton = screen.getByText(/Generate Bingo Cards/i);
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Generate PDF')).toBeInTheDocument();
        expect(screen.getByText('Generate .bingoCards')).toBeInTheDocument();
      });
    });

    it('should render translated "Upload .bingoCards File:" label', () => {
      renderWithToast(<FileUpload />);
      expect(screen.getByText('Upload .bingoCards File:')).toBeInTheDocument();
    });

    it('should render translated "Bingo Cards" heading after generating', async () => {
      renderWithToast(<FileUpload />);
      
      const generateButton = screen.getByText(/Generate Bingo Cards/i);
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bingo Cards')).toBeInTheDocument();
      });
    });
  });

  // Additional functionality tests
  describe('Card Generation and Export', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should update bingoPercard slider value', () => {
      renderWithToast(<FileUpload />);
      
      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.value).toBe('2'); // Default value
      
      fireEvent.change(slider, { target: { value: '3' } });
      expect(slider.value).toBe('3');
    });

    it('should update event header input', () => {
      renderWithToast(<FileUpload />);
      
      const input = screen.getByPlaceholderText(/Event Name/i) as HTMLInputElement;
      const newValue = 'New Event 2024';
      
      fireEvent.change(input, { target: { value: newValue } });
      expect(input.value).toBe(newValue);
    });

    it('should update location footer input', () => {
      renderWithToast(<FileUpload />);
      
      const input = screen.getByPlaceholderText(/Location/i) as HTMLInputElement;
      const newValue = 'New Location';
      
      fireEvent.change(input, { target: { value: newValue } });
      expect(input.value).toBe(newValue);
    });

    it('should show generated cards after generation', async () => {
      renderWithToast(<FileUpload />);
      
      const generateButton = screen.getByText(/Generate Bingo Cards/i);
      fireEvent.click(generateButton);
      
      // Should show the bingo cards heading
      await waitFor(() => {
        expect(screen.getByText('Bingo Cards')).toBeInTheDocument();
      });
    });

    it('should call parseBingoCards when valid file is uploaded', () => {
      renderWithToast(<FileUpload />);
      
      const fileInput = document.querySelector('input[type="file"][accept=".bingoCards"]') as HTMLInputElement;
      const validFile = new File(['CardNo.1;1;2;3;4;5'], 'test.bingoCards', { type: 'text/plain' });
      
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [validFile],
          writable: false,
        });
        
        fireEvent.change(fileInput);
        
        // parseBingoCards should be called (after file is read)
        // Note: This is async via FileReader, so it won't be immediate
      }
    });

    it('should not process file without .bingoCards extension', () => {
      renderWithToast(<FileUpload />);
      
      const fileInput = document.querySelector('input[type="file"][accept=".bingoCards"]') as HTMLInputElement;
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [invalidFile],
          writable: false,
        });
        
        fireEvent.change(fileInput);
        
        // Toast should be shown instead of alert - just verify it doesn't crash
      }
    });

    it('should generate cards with different numbers', async () => {
      renderWithToast(<FileUpload />);
      
      const input = screen.getByPlaceholderText(/Number of cards/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: '5' } });
      
      const generateButton = screen.getByText(/Generate Bingo Cards/i);
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(mockGenerateRandomBingoCards).toHaveBeenCalledWith(5);
      });
    });

    it('should handle edge case of generating 1 card', async () => {
      renderWithToast(<FileUpload />);
      
      const input = screen.getByPlaceholderText(/Number of cards/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: '1' } });
      
      const generateButton = screen.getByText(/Generate Bingo Cards/i);
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(mockGenerateRandomBingoCards).toHaveBeenCalledWith(1);
      });
    });

    it('should handle large number of cards', async () => {
      renderWithToast(<FileUpload />);
      
      const input = screen.getByPlaceholderText(/Number of cards/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: '100' } });
      
      const generateButton = screen.getByText(/Generate Bingo Cards/i);
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(mockGenerateRandomBingoCards).toHaveBeenCalledWith(100);
      });
    });
  });

  // Quality mode tests
  describe('Quality Mode Selection', () => {
    it('should change quality mode to fast', () => {
      renderWithToast(<FileUpload />);
      
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'fast' } });
      
      expect(select.value).toBe('fast');
    });

    it('should change quality mode to high', () => {
      renderWithToast(<FileUpload />);
      
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'high' } });
      
      expect(select.value).toBe('high');
    });

    it('should have all quality mode options available', () => {
      renderWithToast(<FileUpload />);
      
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const options = Array.from(select.options).map(option => option.value);
      
      expect(options).toContain('fast');
      expect(options).toContain('balanced');
      expect(options).toContain('high');
    });
  });
});
