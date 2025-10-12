// components/BingoGame.tsx
"use client";
import React, { useState, useEffect } from "react";
import { Game, Card } from "../utils/bingo.interface";
import { parseBingoCards } from "../utils/utils";
import Ball from "./Ball";
import styles from './BingoGame.module.css';

export default function BingoGame() {
  const [bingoGame, setBingoGame] = useState<Game | null>(null);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [modalMessage, setModalMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [validCard, setValidCard] = useState<Card | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [animatingNumber, setAnimatingNumber] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Load game state from localStorage on component mount
  useEffect(() => {
    const storedGame = localStorage.getItem("bingoGame");
    const storedNumbers = localStorage.getItem("drawnNumbers");

    if (storedGame) {
      setBingoGame(JSON.parse(storedGame));
    }

    if (storedNumbers) {
      const numbers = JSON.parse(storedNumbers);
      setDrawnNumbers(numbers);
    }
  }, []);

  const showModal = (message: string, onConfirm?: () => void) => {
    setModalMessage(message);
    setIsModalOpen(true);
    setConfirmAction(onConfirm || null);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setModalMessage("");
    setConfirmAction(null);
  };

  const handleStartGame = () => {
    if (bingoGame) {
      showModal(
        "A game is already running. Do you want to start a new game?",
        () => {
          startNewGame();
        }
      );
      return;
    }
    startNewGame();
  };

  const startNewGame = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".bingoCards";

    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (!target || !target.files) return;
      const selectedFile = target.files[0];
      if (selectedFile && selectedFile.name.endsWith(".bingoCards")) {
        const reader = new FileReader();
        const filename = selectedFile.name.replace(".bingoCards", "");
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const bingoGame = parseBingoCards(filename, content);
          setBingoGame(bingoGame);
          setDrawnNumbers([]);
          localStorage.setItem("bingoGame", JSON.stringify(bingoGame));
          localStorage.removeItem("drawnNumbers");
        };
        reader.readAsText(selectedFile);
      } else {
        showModal("Please upload a valid .bingoCards file.");
      }
    };

    input.click();
  };

  const handleRestartGame = () => {
    setDrawnNumbers([]);
    localStorage.removeItem("drawnNumbers");
  };

  const handleDrawNumber = () => {
    // Prevent overlapping animations
    if (isAnimating) {
      return;
    }

    if (!bingoGame) {
      showModal("Please start the game first.");
      return;
    }

    const availableNumbers = Array.from({ length: 89 }, (_, i) => i + 1).filter(
      (num) => !drawnNumbers.includes(num)
    );

    if (availableNumbers.length === 0) {
      showModal("All numbers have been drawn.");
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const newNumber = availableNumbers[randomIndex];
    
    // Set animating state to prevent clicks
    setIsAnimating(true);
    
    // Force clear any previous animation state
    setAnimatingNumber(null);
    
    // Trigger animation on the specific ball (small delay to ensure clean state)
    setTimeout(() => {
      setAnimatingNumber(newNumber);
    }, 50);
    
    // Update state after a brief delay to let animation start
    setTimeout(() => {
      localStorage.setItem(
        "drawnNumbers",
        JSON.stringify([...drawnNumbers, newNumber])
      );
      console.log([...drawnNumbers, newNumber]);
      setDrawnNumbers([...drawnNumbers, newNumber]);
    }, 100);
    
    // Reset animation after it completes
    setTimeout(() => {
      setAnimatingNumber(null);
      setIsAnimating(false);
    }, 2550);
  };

  const handleCheckLine = () => {
    const cardNumber = prompt("Insira o número do cartão:");
    if (!cardNumber || !bingoGame) return;

    const card = bingoGame.cards.find(
      (c) => c.cardNumber === parseInt(cardNumber)
    );
    if (!card) {
      showModal("Cartão não encontrado.");
      return;
    }

    const hasLine = checkLine(card.numbers, drawnNumbers);
    if (hasLine) {
      setValidCard(card);
      setIsCardModalOpen(true);
    } else {
      setValidCard(null);
      showModal("Linha não é válida.");
    }
  };

  const handleCheckBingo = () => {
    const cardNumber = prompt("Insira número do cartão (ultimos dígitos após ultimo '-'):");
    if (!cardNumber || !bingoGame) return;

    const card = bingoGame.cards.find(
      (c) => c.cardNumber === parseInt(cardNumber)
    );
    if (!card) {
      showModal("cartão não encontrado.");
      return;
    }

    const hasBingo = checkBingo(card.numbers, drawnNumbers);
    if (hasBingo) {
      setValidCard(card);
      setIsCardModalOpen(true);
      showModal("Bingo!");
    } else {
      setValidCard(null);
      showModal("Bing não é válido.");
    }
  };

  return (
    <div className="game-page">
      <div className={styles.game_controls}>
        <div className={styles.all_numbers}>
          <div className={styles.numbers_grid}>
            {Array.from({ length: 89 }, (_, i) => i + 1).map((num) => (
              <Ball 
                key={num} 
                number={num} 
                small 
                drawn={drawnNumbers.includes(num)}
                animate={animatingNumber === num}
              />
            ))}
          </div>
        </div>
      </div>
      <div className={`${styles.button_row} ${styles.flex_wrap}`}>
        <button onClick={handleStartGame} className="button-style">
          Iniciar Jogo
        </button>
        <button onClick={handleRestartGame} className="button-style">
          Recomeçar
        </button>
        <button 
          onClick={handleDrawNumber} 
          className={`button-style ${styles.draw_button} ${isAnimating ? styles.disabled : ''}`}
          disabled={isAnimating}
        >
          Próxima Bola 🎱
        </button>
        <button onClick={handleCheckLine} className="button-style">
          Validar Linha
        </button>
        <button onClick={handleCheckBingo} className="button-style">
          Validar Bingo
        </button>
      </div>
      {validCard && isCardModalOpen && (
        <div className={styles.modal_overlay}>
          <div className={`${styles.modal_box} ${styles.card_modal}`}>
            <div className={styles.modal_header}>
              <h3>Card Number: {validCard.cardTitle}</h3>
              <button 
                onClick={() => setIsCardModalOpen(false)}
                className={styles.close_button}
              >
                ×
              </button>
            </div>
            <div className="grid-container">
              {validCard.numbers.map((num, idx) => (
                <div
                  key={idx}
                  className={`bingo-cell ${num === null ? "empty" : ""} ${
                    num !== null && drawnNumbers.includes(num) ? "marked" : ""
                  }`}
                >
                  {num !== null ? num : ""}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {isModalOpen && (
        <div className={styles.modal_overlay}>
          <div className={styles.modal_box}>
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
function checkLine(
  numbers: (number | null)[],
  drawnNumbers: number[]
): boolean {
  const lines = [
    [0, 1, 2, 3, 4], // First row
    [5, 6, 7, 8, 9], // Second row
    [10, 11, 12, 13, 14], // Third row
  ];

  return lines.some((line) =>
    line.every(
      (index) =>
        numbers[index] === null || drawnNumbers.includes(numbers[index]!)
    )
  );
}

function checkBingo(
  numbers: (number | null)[],
  drawnNumbers: number[]
): boolean {
  return numbers.every((num) => num === null || drawnNumbers.includes(num));
}
