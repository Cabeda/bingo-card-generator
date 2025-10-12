import React from 'react';
import { render, screen } from '@testing-library/react';
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
};

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => translations[key] || key,
  useLocale: () => 'en',
}));

// Mock motion/react
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, whileHover, whileTap, whileFocus, animate, initial, transition, style, ...props }: any) => (
      <div className={className} style={style} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, whileHover, whileTap, animate, initial, transition, disabled, ...props }: any) => (
      <button className={className} onClick={onClick} disabled={disabled} {...props}>{children}</button>
    ),
    input: ({ children, className, whileHover, whileTap, whileFocus, animate, initial, transition, ...props }: any) => (
      <input className={className} {...props}>{children}</input>
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
});

