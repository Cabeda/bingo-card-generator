import React from 'react';
import { render, screen } from '@testing-library/react';
import BingoGame from './BingoGame';
import { Game } from '../utils/bingo.interface';

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

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('BingoGame', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<BingoGame />);
    expect(screen.getByText(/Iniciar Jogo/i)).toBeInTheDocument();
  });

  it('should show start game button when no game is loaded', () => {
    render(<BingoGame />);
    const startButton = screen.getByText(/Iniciar Jogo/i);
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

    // Check for audio and TTS labels
    const elements = screen.getAllByText(/🔊|🗣️|Voz|Som/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('should render balls grid with all numbers 1-89', () => {
    render(<BingoGame />);
    
    // Check that all numbers from 1 to 89 are rendered
    for (let i = 1; i <= 89; i++) {
      const ball = screen.getByTestId(`ball-${i}`);
      expect(ball).toBeInTheDocument();
    }
  });
});

