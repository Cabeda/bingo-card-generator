// components/BingoGame.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  const [cardToValidate, setCardToValidate] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(false);

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
  }, []); // Added to initialize for localStorage

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

  const handleDrawNumber = useCallback(() => {
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
      
      // Audio feedback
      if (audioEnabled && typeof Audio !== 'undefined') {
        // Simple beep sound using Web Audio API
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      }
      
      // Text-to-speech
      if (ttsEnabled && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`Número ${newNumber}`);
        utterance.lang = 'pt-PT';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    }, 100);
    
    // Reset animation after it completes
    setTimeout(() => {
      setAnimatingNumber(null);
      setIsAnimating(false);
    }, 1000);
  }, [isAnimating, bingoGame, drawnNumbers, audioEnabled, ttsEnabled]);

  // Keyboard shortcuts - must be after handleDrawNumber is defined
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Space or Enter to draw next ball
      if ((e.key === ' ' || e.key === 'Enter') && !isAnimating && bingoGame) {
        e.preventDefault();
        handleDrawNumber();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAnimating, bingoGame, handleDrawNumber]);

  const handleCheckLine = (cardNumberInput?: string) => {
    const cardNumber = cardNumberInput || cardToValidate;
    if (!cardNumber || !bingoGame) {
      showModal("Por favor insira o número do cartão.");
      return;
    }

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
      setCardToValidate("");
    } else {
      setValidCard(null);
      showModal("Linha não é válida.");
    }
  };

  const handleCheckBingo = (cardNumberInput?: string) => {
    const cardNumber = cardNumberInput || cardToValidate;
    if (!cardNumber || !bingoGame) {
      showModal("Por favor insira o número do cartão.");
      return;
    }

    const card = bingoGame.cards.find(
      (c) => c.cardNumber === parseInt(cardNumber)
    );
    if (!card) {
      showModal("Cartão não encontrado.");
      return;
    }

    const hasBingo = checkBingo(card.numbers, drawnNumbers);
    if (hasBingo) {
      setValidCard(card);
      setIsCardModalOpen(true);
      setCardToValidate("");
      showModal("🎉 Bingo! 🎉");
    } else {
      setValidCard(null);
      showModal("Bingo não é válido.");
    }
  };

  return (
    <div className="game-page">
      <div className={styles.desktop_layout}>
        {/* Main content area - Numbers Grid */}
        <div className={styles.main_content}>
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
        </div>

        {/* Sidebar - Controls and Recent Numbers (Sticky on Desktop) */}
        <aside className={styles.sidebar}>
          {/* Recent Numbers */}
          <AnimatePresence>
            {drawnNumbers.length > 0 && (
              <motion.div 
                className={styles.recent_numbers}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <h3>Últimas Bolas</h3>
                <div className={styles.recent_list}>
                  {drawnNumbers.slice(-10).reverse().map((num, idx) => (
                    <motion.span 
                      key={`${num}-${drawnNumbers.length - idx}`}
                      className={styles.recent_number}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 400, 
                        damping: 15,
                        delay: idx * 0.05
                      }}
                      layout
                    >
                      {num}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game Controls */}
          <div className={styles.button_row}>
            <motion.button 
              onClick={handleStartGame} 
              className="button-style"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              Iniciar Jogo
            </motion.button>
            <motion.button 
              onClick={handleRestartGame} 
              className="button-style"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              Recomeçar
            </motion.button>
            <motion.button 
              onClick={handleDrawNumber} 
              className={`button-style ${styles.draw_button} ${isAnimating ? styles.disabled : ''}`}
              title="Pressione Espaço ou Enter"
              whileHover={!isAnimating ? { scale: 1.05 } : {}}
              whileTap={!isAnimating ? { scale: 0.95 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              Próxima Bola 🎱
            </motion.button>
          </div>

          {/* Audio/TTS Settings */}
          <div className={styles.settings_row}>
            <label className={styles.setting_item}>
              <input 
                type="checkbox" 
                checked={audioEnabled}
                onChange={(e) => setAudioEnabled(e.target.checked)}
              />
              <span>🔊 Som</span>
            </label>
            <label className={styles.setting_item}>
              <input 
                type="checkbox" 
                checked={ttsEnabled}
                onChange={(e) => setTtsEnabled(e.target.checked)}
              />
              <span>🗣️ Voz</span>
            </label>
          </div>

          {/* Validation Panel */}
          <div className={styles.validation_panel}>
            <h3>Validar Cartão</h3>
            <div className={styles.validation_controls}>
              <motion.input 
                type="number" 
                placeholder="Nº do Cartão"
                value={cardToValidate}
                onChange={(e) => setCardToValidate(e.target.value)}
                className={styles.card_input}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && cardToValidate) {
                    handleCheckLine(cardToValidate);
                  }
                }}
                whileFocus={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              />
              <motion.button 
                onClick={() => handleCheckLine(cardToValidate)} 
                className="button-style"
                disabled={!cardToValidate}
                whileHover={cardToValidate ? { scale: 1.05 } : {}}
                whileTap={cardToValidate ? { scale: 0.95 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                Validar Linha
              </motion.button>
              <motion.button 
                onClick={() => handleCheckBingo(cardToValidate)} 
                className="button-style"
                disabled={!cardToValidate}
                whileHover={cardToValidate ? { scale: 1.05 } : {}}
                whileTap={cardToValidate ? { scale: 0.95 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                Validar Bingo
              </motion.button>
            </div>
          </div>
        </aside>
      </div>
      <AnimatePresence>
        {validCard && isCardModalOpen && (
          <motion.div 
            className={styles.modal_overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div 
              className={`${styles.modal_box} ${styles.card_modal}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className={styles.modal_header}>
                <h3>Card Number: {validCard.cardTitle}</h3>
                <motion.button 
                  onClick={() => setIsCardModalOpen(false)}
                  className={styles.close_button}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  ×
                </motion.button>
              </div>
              <div className="grid-container">
                {validCard.numbers.map((num, idx) => (
                  <motion.div
                    key={idx}
                    className={`bingo-cell ${num === null ? "empty" : ""} ${
                      num !== null && drawnNumbers.includes(num) ? "marked" : ""
                    }`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ 
                      delay: idx * 0.02,
                      type: "spring", 
                      stiffness: 300, 
                      damping: 20 
                    }}
                  >
                    {num !== null ? num : ""}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            className={styles.modal_overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div 
              className={styles.modal_box}
              initial={{ scale: 0.8, y: -50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <p>{modalMessage}</p>
              {confirmAction ? (
                <div>
                  <motion.button
                    onClick={() => {
                      confirmAction();
                      handleModalClose();
                    }}
                    className="button-style"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    Yes
                  </motion.button>
                  <motion.button 
                    onClick={handleModalClose} 
                    className="button-style"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    No
                  </motion.button>
                </div>
              ) : (
                <motion.button 
                  onClick={handleModalClose} 
                  className="button-style"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  Close
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
