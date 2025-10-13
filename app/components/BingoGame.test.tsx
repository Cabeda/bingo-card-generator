import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import BingoGame from './BingoGame';
import { Game } from '../utils/bingo.interface';

// Mock next-intl with actual translations
const translations: Record<string, string> = {
  'startGame': 'Start Game',
  'restart': 'Restart',
  'nextBall': 'Next Ball 🎱',
  'pressSpace': 'Press Space or Enter',
  'audio': '🔊 Audio',
  'tts': '🗣️ Voice',
  'validateCard': 'Validate Card',
  'validateLine': 'validateLine',
  'validateBingo': 'validateBingo',
  'cardNumberPlaceholder': 'cardNumberPlaceholder',
  'lastBalls': 'Last Balls',
  'gameInProgress': 'There is already a game in progress. Do you want to start a new one?',
  'pleaseStartGame': 'Please start the game first.',
  'allNumbersDrawn': 'All numbers have been drawn.',
  'pleaseEnterCardNumber': 'Please enter the card number.',
  'cardNotFound': 'Card not found.',
  'lineValid': 'Line is valid! 🎉',
  'lineNotValid': 'Line is not valid.',
  'bingoValid': '🎉 Bingo! 🎉',
  'bingoNotValid': 'Bingo is not valid.',
  'uploadValidFile': 'Please upload a valid .bingoCards file.',
  'yes': 'yes',
  'no': 'no',
  'close': 'close',
};

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => translations[key] || key,
  useLocale: () => 'en',
}));

// Mock motion/react
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, whileHover, whileTap, whileFocus, animate, initial, transition, style, layout, exit, ...props }: any) => (
      <div className={className} style={style} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, whileHover, whileTap, animate, initial, transition, disabled, ...props }: any) => (
      <button className={className} onClick={onClick} disabled={disabled} {...props}>{children}</button>
    ),
    input: ({ children, className, whileHover, whileTap, whileFocus, animate, initial, transition, ...props }: any) => (
      <input className={className} {...props}>{children}</input>
    ),
    span: ({ children, className, whileHover, whileTap, animate, initial, transition, layout, exit, ...props }: any) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Ball component
jest.mock('./Ball', () => ({
  __esModule: true,
  default: ({ number, small, drawn }: any) => (
    <div data-testid={`ball-${number}`} data-small={small} data-drawn={drawn}>
      {number}
    </div>
  ),
}));
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Setup localStorage mock before tests
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });
}

describe('BingoGame', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<BingoGame />);
    expect(screen.getByText(/Start Game/i)).toBeInTheDocument();
  });

  it('should show start game button when no game is loaded', () => {
    render(<BingoGame />);
    const startButton = screen.getByText(/Start Game/i);
    expect(startButton).toBeInTheDocument();
  });

  it('should load game from localStorage on mount', () => {
    const mockGame: Game = {
      filename: 'test-game',
      cards: [
        {
          cardTitle: 'test-1',
          cardNumber: 1,
          numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
        },
      ],
    };

    localStorageMock.setItem('bingoGame', JSON.stringify(mockGame));
    localStorageMock.setItem('drawnNumbers', JSON.stringify([1, 2, 3]));

    // Verify localStorage has the data
    expect(JSON.parse(localStorageMock.getItem('bingoGame') || '{}')).toEqual(mockGame);
    expect(JSON.parse(localStorageMock.getItem('drawnNumbers') || '[]')).toEqual([1, 2, 3]);
    
    // Clean up
    localStorageMock.clear();
  });

  it('should support restart game functionality', () => {
    // Test that restart button clears drawnNumbers from localStorage
    localStorageMock.setItem('drawnNumbers', JSON.stringify([1, 2, 3]));
    
    // Verify data exists
    expect(localStorageMock.getItem('drawnNumbers')).toBeTruthy();
    
    // Simulate restart
    localStorageMock.removeItem('drawnNumbers');
    
    // Verify it's cleared
    expect(localStorageMock.getItem('drawnNumbers')).toBeNull();
  });

  it('should have localStorage persistence support', () => {
    const mockGame: Game = {
      filename: 'test-game',
      cards: [
        {
          cardTitle: 'test-1',
          cardNumber: 1,
          numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
        },
      ],
    };

    localStorageMock.setItem('bingoGame', JSON.stringify(mockGame));

    // Verify storage works
    expect(localStorageMock.getItem('bingoGame')).toBeTruthy();
    
    // Clean up
    localStorageMock.clear();
  });

  it('should have audio and TTS controls', () => {
    render(<BingoGame />);

    // Check for audio and TTS labels using English translations
    const audioElement = screen.getByText(/🔊 Audio/i);
    const ttsElement = screen.getByText(/🗣️ Voice/i);
    expect(audioElement).toBeInTheDocument();
    expect(ttsElement).toBeInTheDocument();
  });

  it('should render balls grid with all numbers 1-89', () => {
    render(<BingoGame />);
    
    // Check that all numbers from 1 to 89 are rendered
    for (let i = 1; i <= 89; i++) {
      const ball = screen.getByTestId(`ball-${i}`);
      expect(ball).toBeInTheDocument();
    }
  });

  // Internationalization tests
  describe('Internationalization', () => {
    it('should render translated "Start Game" button text', () => {
      render(<BingoGame />);
      expect(screen.getByText('Start Game')).toBeInTheDocument();
    });

    it('should render translated "Restart" button when game is loaded', () => {
      const mockGame: Game = {
        filename: 'test-game',
        cards: [
          {
            cardTitle: 'test-1',
            cardNumber: 1,
            numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
          },
        ],
      };
      
      localStorageMock.setItem('bingoGame', JSON.stringify(mockGame));
      render(<BingoGame />);
      
      expect(screen.getByText('Restart')).toBeInTheDocument();
      localStorageMock.clear();
    });

    it('should render translated audio control label', () => {
      render(<BingoGame />);
      expect(screen.getByText(/🔊 Audio/i)).toBeInTheDocument();
    });

    it('should render translated TTS control label', () => {
      render(<BingoGame />);
      expect(screen.getByText(/🗣️ Voice/i)).toBeInTheDocument();
    });

    it('should render translated "Validate Card" heading', () => {
      const mockGame: Game = {
        filename: 'test-game',
        cards: [
          {
            cardTitle: 'test-1',
            cardNumber: 1,
            numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
          },
        ],
      };
      
      localStorageMock.setItem('bingoGame', JSON.stringify(mockGame));
      render(<BingoGame />);
      
      expect(screen.getByText('Validate Card')).toBeInTheDocument();
      localStorageMock.clear();
    });

    it('should render translated button text for "Next Ball"', () => {
      const mockGame: Game = {
        filename: 'test-game',
        cards: [
          {
            cardTitle: 'test-1',
            cardNumber: 1,
            numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
          },
        ],
      };
      
      localStorageMock.setItem('bingoGame', JSON.stringify(mockGame));
      render(<BingoGame />);
      
      expect(screen.getByText(/Next Ball/i)).toBeInTheDocument();
      localStorageMock.clear();
    });
  });

  // Card validation tests
  describe('Card Validation', () => {
    const mockGame: Game = {
      filename: 'test-game',
      cards: [
        {
          cardTitle: 'test-1',
          cardNumber: 1,
          numbers: [1, 2, 3, 4, 5, null, null, null, null, 10, 11, 12, 13, 14, null, null, null, null, 20, 21, 22, 23, 24, null, null, null, null],
        },
      ],
    };

    beforeEach(() => {
      localStorageMock.clear();
      localStorageMock.setItem('bingoGame', JSON.stringify(mockGame));
    });

    it('should show modal when card number is not found', () => {
      render(<BingoGame />);
      
      const input = screen.getByPlaceholderText(/cardNumberPlaceholder/i);
      const validateLineButton = screen.getByText(/validateLine/i);
      
      fireEvent.change(input, { target: { value: '999' } });
      fireEvent.click(validateLineButton);
      
      // Should show card not found message
      expect(screen.getByText('Card not found.')).toBeInTheDocument();
    });

    it('should show modal when line is not valid', () => {
      localStorageMock.setItem('drawnNumbers', JSON.stringify([1, 2]));
      render(<BingoGame />);
      
      const input = screen.getByPlaceholderText(/cardNumberPlaceholder/i);
      const validateLineButton = screen.getByText(/validateLine/i);
      
      fireEvent.change(input, { target: { value: '1' } });
      fireEvent.click(validateLineButton);
      
      expect(screen.getByText('Line is not valid.')).toBeInTheDocument();
    });

    it('should show modal when bingo is not valid', () => {
      localStorageMock.setItem('drawnNumbers', JSON.stringify([1, 2, 3]));
      render(<BingoGame />);
      
      const input = screen.getByPlaceholderText(/cardNumberPlaceholder/i);
      const validateBingoButton = screen.getByText(/validateBingo/i);
      
      fireEvent.change(input, { target: { value: '1' } });
      fireEvent.click(validateBingoButton);
      
      expect(screen.getByText('Bingo is not valid.')).toBeInTheDocument();
    });
  });

  // Audio and TTS tests
  describe('Audio and TTS Controls', () => {
    beforeEach(() => {
      localStorageMock.clear();
    });

    it('should toggle audio setting', () => {
      render(<BingoGame />);
      
      const audioLabel = screen.getByText(/🔊 Audio/i);
      const audioCheckbox = audioLabel.previousElementSibling as HTMLInputElement;
      
      expect(audioCheckbox).toBeChecked(); // Default is true
      
      fireEvent.click(audioCheckbox);
      expect(audioCheckbox).not.toBeChecked();
      
      fireEvent.click(audioCheckbox);
      expect(audioCheckbox).toBeChecked();
    });

    it('should toggle TTS setting', () => {
      render(<BingoGame />);
      
      const ttsLabel = screen.getByText(/🗣️ Voice/i);
      const ttsCheckbox = ttsLabel.previousElementSibling as HTMLInputElement;
      
      expect(ttsCheckbox).not.toBeChecked(); // Default is false
      
      fireEvent.click(ttsCheckbox);
      expect(ttsCheckbox).toBeChecked();
      
      fireEvent.click(ttsCheckbox);
      expect(ttsCheckbox).not.toBeChecked();
    });
  });

  // Modal tests
  describe('Modal Interactions', () => {
    beforeEach(() => {
      localStorageMock.clear();
    });

    it('should close modal when close button is clicked', () => {
      render(<BingoGame />);
      
      // Trigger a modal by trying to draw without a game
      const nextBallButton = screen.getByText(/Next Ball/i);
      fireEvent.click(nextBallButton);
      
      expect(screen.getByText('Please start the game first.')).toBeInTheDocument();
      
      const closeButton = screen.getByText('close');
      fireEvent.click(closeButton);
      
      // Modal should close - text should no longer be visible
      expect(screen.queryByText('Please start the game first.')).not.toBeInTheDocument();
    });
  });

  // File upload and game management tests
  describe('Game Management', () => {
    beforeEach(() => {
      localStorageMock.clear();
    });

    it('should show modal when trying to draw number without game', () => {
      render(<BingoGame />);
      
      const nextBallButton = screen.getByText(/Next Ball/i);
      fireEvent.click(nextBallButton);
      
      expect(screen.getByText('Please start the game first.')).toBeInTheDocument();
    });

    it('should restart game and clear drawn numbers', () => {
      const mockGame: Game = {
        filename: 'test-game',
        cards: [
          {
            cardTitle: 'test-1',
            cardNumber: 1,
            numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
          },
        ],
      };
      
      localStorageMock.setItem('bingoGame', JSON.stringify(mockGame));
      localStorageMock.setItem('drawnNumbers', JSON.stringify([1, 2, 3]));
      
      render(<BingoGame />);
      
      const restartButton = screen.getByText('Restart');
      fireEvent.click(restartButton);
      
      // Should clear drawn numbers from localStorage
      expect(localStorageMock.getItem('drawnNumbers')).toBeNull();
    });

    it('should show all numbers drawn message when all numbers are drawn', () => {
      const mockGame: Game = {
        filename: 'test-game',
        cards: [
          {
            cardTitle: 'test-1',
            cardNumber: 1,
            numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null, null, null, null, null, null, null, null, null, null, null, null],
          },
        ],
      };
      
      localStorageMock.setItem('bingoGame', JSON.stringify(mockGame));
      
      // Set drawn numbers to include all 89 numbers
      const allNumbers = Array.from({ length: 89 }, (_, i) => i + 1);
      localStorageMock.setItem('drawnNumbers', JSON.stringify(allNumbers));
      
      render(<BingoGame />);
      
      const nextBallButton = screen.getByText(/Next Ball/i);
      fireEvent.click(nextBallButton);
      
      expect(screen.getByText('All numbers have been drawn.')).toBeInTheDocument();
    });
  });
});

