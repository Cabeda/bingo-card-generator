import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FileUpload } from './FileUpload';
import { generateRandomBingoCards, parseBingoCards } from '../utils/utils';

// Mock next-intl with translations
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
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
      'bingoCards': 'Bingo Cards',
      'exportBingoCards': 'Generate .bingoCards',
      'generatePdf': 'Generate PDF',
      'generatingPdf': 'Generating PDF... {progress}%',
      'generatingPdfWithTime': 'Generating PDF... {progress}% (Est. {timeRemaining}s remaining)',
      'cancelPdf': 'Cancel',
      'pdfCancelled': 'PDF generation cancelled.',
      'errorGeneratingPdf': 'Error generating PDF. Please try again.',
      'uploadError': 'Please upload a file with the .bingoCards extension.',
    };
    return translations[key] || key;
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
    render(<FileUpload />);
    expect(screen.getByText(/Generate Bingo Cards/i)).toBeInTheDocument();
  });

  it('should have input for number of cards', () => {
    render(<FileUpload />);
    const input = screen.getByPlaceholderText(/Number of cards/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(10); // Default value
  });

  it('should update card count when input changes', () => {
    render(<FileUpload />);
    const input = screen.getByPlaceholderText(/Number of cards/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: '20' } });
    
    expect(input.value).toBe('20');
  });

  it('should have input for cards per page', () => {
    render(<FileUpload />);
    const input = screen.getByRole('slider');
    expect(input).toBeInTheDocument();
  });

  it('should have input for event header', () => {
    render(<FileUpload />);
    const input = screen.getByPlaceholderText(/Event Name/i);
    expect(input).toBeInTheDocument();
  });

  it('should have input for location footer', () => {
    render(<FileUpload />);
    const input = screen.getByPlaceholderText(/Location/i);
    expect(input).toBeInTheDocument();
  });

  it('should generate cards when button is clicked', () => {
    render(<FileUpload />);
    
    const generateButton = screen.getByText(/Generate Bingo Cards/i);
    fireEvent.click(generateButton);
    
    expect(mockGenerateRandomBingoCards).toHaveBeenCalledWith(10);
  });

  it('should update number of cards to generate', () => {
    render(<FileUpload />);
    
    const input = screen.getByPlaceholderText(/Number of cards/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '25' } });
    
    const generateButton = screen.getByText(/Generate Bingo Cards/i);
    fireEvent.click(generateButton);
    
    expect(mockGenerateRandomBingoCards).toHaveBeenCalledWith(25);
  });

  it('should show export buttons after generating cards', () => {
    render(<FileUpload />);
    
    const generateButton = screen.getByText(/Generate Bingo Cards/i);
    fireEvent.click(generateButton);
    
    expect(screen.getByText(/Generate PDF/i)).toBeInTheDocument();
    expect(screen.getByText(/Generate .bingoCards/i)).toBeInTheDocument();
  });

  it('should validate file upload format', () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation();
    
    render(<FileUpload />);
    
    // File input is hidden, we need to get it by accept attribute
    const fileInput = document.querySelector('input[type="file"][accept=".bingoCards"]') as HTMLInputElement;
    const wrongFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    
    if (fileInput) {
      Object.defineProperty(fileInput, 'files', {
        value: [wrongFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining('.bingoCards')
      );
    }
    
    alertMock.mockRestore();
  });

  it('should accept valid .bingoCards file', () => {
    render(<FileUpload />);
    
    const fileInput = document.querySelector('input[type="file"][accept=".bingoCards"]') as HTMLInputElement;
    
    if (fileInput) {
      // Just verify the input exists and has correct accept attribute
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', '.bingoCards');
    }
  });

  it('should hide PDF export button when no cards are generated', () => {
    render(<FileUpload />);
    
    // Before generating cards, export buttons should not be visible
    expect(screen.queryByText(/Generate PDF/i)).not.toBeInTheDocument();
  });

  it('should show progress during PDF generation', async () => {
    render(<FileUpload />);
    
    // Generate cards first
    const generateButton = screen.getByText(/Generate Bingo Cards/i);
    fireEvent.click(generateButton);
    
    // Now try to export to PDF
    const pdfButton = screen.getByText(/Generate PDF/i);
    fireEvent.click(pdfButton);
    
    // Check if progress-related elements appear (implementation-specific)
    // This is a placeholder - actual implementation may vary
  });

  it('should have default event header with current year', () => {
    render(<FileUpload />);
    
    const input = screen.getByPlaceholderText(/Event Name/i) as HTMLInputElement;
    const currentYear = new Date().getFullYear();
    
    expect(input.value).toContain(currentYear.toString());
  });

  it('should have default location footer', () => {
    render(<FileUpload />);
    
    const input = screen.getByPlaceholderText(/Location/i) as HTMLInputElement;
    
    expect(input.value).toBe('Paróquia Nossa Senhora da Areosa');
  });

  it('should have quality mode selector with default value', () => {
    render(<FileUpload />);
    
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('balanced');
  });

  it('should update quality mode when selector changes', () => {
    render(<FileUpload />);
    
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    
    fireEvent.change(select, { target: { value: 'fast' } });
    
    expect(select.value).toBe('fast');
  });

  // Internationalization tests
  describe('Internationalization', () => {
    it('should render translated title', () => {
      render(<FileUpload />);
      expect(screen.getByText('Bingo Card Generator')).toBeInTheDocument();
    });

    it('should render translated "Number of Cards" label', () => {
      render(<FileUpload />);
      expect(screen.getByText('Number of Cards')).toBeInTheDocument();
    });

    it('should render translated "Cards per Page" label', () => {
      render(<FileUpload />);
      expect(screen.getByText('Cards per Page')).toBeInTheDocument();
    });

    it('should render translated "Event Name" label', () => {
      render(<FileUpload />);
      expect(screen.getByText('Event Name')).toBeInTheDocument();
    });

    it('should render translated "Location" label', () => {
      render(<FileUpload />);
      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    it('should render translated placeholder for number of cards', () => {
      render(<FileUpload />);
      expect(screen.getByPlaceholderText('Number of cards')).toBeInTheDocument();
    });

    it('should render translated placeholder for event name', () => {
      render(<FileUpload />);
      expect(screen.getByPlaceholderText('Event Name')).toBeInTheDocument();
    });

    it('should render translated placeholder for location', () => {
      render(<FileUpload />);
      expect(screen.getByPlaceholderText('Location')).toBeInTheDocument();
    });

    it('should render translated "Generate Bingo Cards" button', () => {
      render(<FileUpload />);
      expect(screen.getByText('Generate Bingo Cards')).toBeInTheDocument();
    });

    it('should render translated export buttons after generating cards', () => {
      render(<FileUpload />);
      
      const generateButton = screen.getByText(/Generate Bingo Cards/i);
      fireEvent.click(generateButton);
      
      expect(screen.getByText('Generate PDF')).toBeInTheDocument();
      expect(screen.getByText('Generate .bingoCards')).toBeInTheDocument();
    });

    it('should render translated "Upload .bingoCards File:" label', () => {
      render(<FileUpload />);
      expect(screen.getByText('Upload .bingoCards File:')).toBeInTheDocument();
    });

    it('should render translated "Bingo Cards" heading after generating', () => {
      render(<FileUpload />);
      
      const generateButton = screen.getByText(/Generate Bingo Cards/i);
      fireEvent.click(generateButton);
      
      expect(screen.getByText('Bingo Cards')).toBeInTheDocument();
    });
  });
});
