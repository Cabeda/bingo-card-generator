// components/BingoGame.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { Game, Card } from '../utils/bingo.interface';
import { parseBingoCards } from '../utils/utils';
import Ball from './Ball';

export default function BingoGame() {
  const [bingoGame, setBingoGame] = useState<Game | null>(null);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [modalMessage, setModalMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [validCard, setValidCard] = useState<Card | null>(null);

  // Load game state from localStorage on component mount
  useEffect(() => {
    const storedGame = localStorage.getItem('bingoGame');
    const storedNumbers = localStorage.getItem('drawnNumbers');
    const storedCurrentNumber = localStorage.getItem('currentNumber');

    if (storedGame) {      
      setBingoGame(JSON.parse(storedGame));
    }

    if (storedNumbers) {
      const numbers = JSON.parse(storedNumbers);
      setDrawnNumbers(numbers);
    }

    if (storedCurrentNumber) {
      setCurrentNumber(2);
    }
  }, []);


  const showModal = (message: string, onConfirm?: () => void) => {
    setModalMessage(message);
    setIsModalOpen(true);
    setConfirmAction(onConfirm || null);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setModalMessage('');
    setConfirmAction(null);
  };

  const handleStartGame = () => {
    if (bingoGame) {
      showModal('A game is already running. Do you want to start a new game?', () => {
        startNewGame();
      });
      return;
    }
    startNewGame();
  };

  const startNewGame = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bingoCards';

    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (!target || !target.files) return;
      const selectedFile = target.files[0];
      if (selectedFile && selectedFile.name.endsWith('.bingoCards')) {
        const reader = new FileReader();
        const filename = selectedFile.name.replace('.bingoCards', '');
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const bingoGame = parseBingoCards(filename, content);
          setBingoGame(bingoGame);
          setDrawnNumbers([]);
          setCurrentNumber(null);
          localStorage.setItem('bingoGame', JSON.stringify(bingoGame));
          localStorage.removeItem('drawnNumbers');
          localStorage.removeItem('currentNumber');
        };
        reader.readAsText(selectedFile);
      } else {
        showModal('Please upload a valid .bingoCards file.');
      }
    };

    input.click();
  };

  const handleRestartGame = () => {
    setDrawnNumbers([]);
    setCurrentNumber(null);
    localStorage.removeItem('drawnNumbers');
    localStorage.removeItem('currentNumber');
  };

  const handleDrawNumber = () => {
    if (!bingoGame) {
      showModal('Please start the game first.');
      return;
    }

    const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1).filter(
      (num) => !drawnNumbers.includes(num)
    );

    if (availableNumbers.length === 0) {
      showModal('All numbers have been drawn.');
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const newNumber = availableNumbers[randomIndex];
    localStorage.setItem('currentNumber', JSON.stringify(currentNumber));
    localStorage.setItem('drawnNumbers', JSON.stringify([...drawnNumbers, newNumber]));
    console.log([...drawnNumbers, newNumber]);
    setCurrentNumber(newNumber);
    setDrawnNumbers([...drawnNumbers, newNumber]);
  };

  const handleCheckLine = () => {
    const cardNumber = prompt('Enter card number:');
    if (!cardNumber || !bingoGame) return;

    const card = bingoGame.cards.find((c) => c.cardNumber === cardNumber);
    if (!card) {
      showModal('Card not found.');
      return;
    }

    const hasLine = checkLine(card.numbers, drawnNumbers);
    if (hasLine) {
      setValidCard(card);
      showModal('Line is valid!');
    } else {
      setValidCard(null);
      showModal('Line is not valid.');
    }
  };

  const handleCheckBingo = () => {
    const cardNumber = prompt('Enter card number:');
    if (!cardNumber || !bingoGame) return;

    const card = bingoGame.cards.find((c) => c.cardNumber === cardNumber);
    if (!card) {
      showModal('Card not found.');
      return;
    }

    const hasBingo = checkBingo(card.numbers, drawnNumbers);
    if (hasBingo) {
      setValidCard(card);
      showModal('Bingo!');
    } else {
      setValidCard(null);
      showModal('Not a Bingo yet.');
    }
  };

  return (
    <div className="game-page">
      <h1>Bingo Game</h1>
      <button onClick={handleStartGame} className="button-style">
        Start Game
      </button>
      <button onClick={handleRestartGame} className="button-style">
        Restart Game
      </button>
      <button onClick={handleDrawNumber} className="button-style">
        Show New Bingo Ball
      </button>
      {currentNumber && (
        <Ball number={currentNumber} />
      )}
      <button onClick={handleCheckLine} className="button-style">
        Check Line
      </button>
      <button onClick={handleCheckBingo} className="button-style">
        Check Bingo
      </button>
      {drawnNumbers.length > 0 && (
        <div className="drawn-numbers">
          <h3>Drawn Numbers:</h3>
          <div className="drawn-balls">
            {drawnNumbers.map((num, idx) => (
              <Ball key={idx} number={num} small />
            ))}
          </div>
        </div>
      )}

      {validCard && (
        <div className="bingo-card">
          <h3>Card Number: {validCard.cardNumber}</h3>
          <div className="grid-container">
            {validCard.numbers.map((num, idx) => (
              <div
                key={idx}
                className={`bingo-cell ${num === null ? 'empty' : ''} ${
                  num !== null && drawnNumbers.includes(num) ? 'marked' : ''
                }`}
              >
                {num !== null ? num : ''}
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <p>{modalMessage}</p>
            {confirmAction ? (
              <div>
                <button
                  onClick={() => {
                    confirmAction();
                    handleModalClose();
                  }}
                  className="button-style"
                >
                  Yes
                </button>
                <button onClick={handleModalClose} className="button-style">
                  No
                </button>
              </div>
            ) : (
              <button onClick={handleModalClose} className="button-style">
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Utility functions
function checkLine(numbers: (number | null)[], drawnNumbers: number[]): boolean {
  const lines = [
    [0, 1, 2, 3, 4],      // First row
    [5, 6, 7, 8, 9],      // Second row
    [10, 11, 12, 13, 14], // Third row
    [0, 5, 10],           // First column
    [1, 6, 11],           // Second column
    [2, 7, 12],           // Middle column
    [3, 8, 13],           // Fourth column
    [4, 9, 14],           // Fifth column
    // Add more lines as needed
  ];

  return lines.some((line) =>
    line.every(
      (index) =>
        numbers[index] === null || drawnNumbers.includes(numbers[index]!)
    )
  );
}

function checkBingo(numbers: (number | null)[], drawnNumbers: number[]): boolean {
  return numbers.every(
    (num) => num === null || drawnNumbers.includes(num)
  );
}