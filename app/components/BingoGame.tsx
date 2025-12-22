// components/BingoGame.tsx
"use client";
import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Card, Game } from "../utils/bingo.interface";
import { parseBingoCards } from "../utils/utils";
import Ball from "./Ball";
import styles from './BingoGame.module.css';

/**
 * BingoGame component for hosting and managing live bingo games.
 * 
 * This component provides a complete bingo game interface with:
 * - Loading bingo card sets from `.bingoCards` files
 * - Drawing random numbers with visual animations
 * - Real-time tracking of drawn numbers
 * - Card validation (line and full bingo)
 * - Audio feedback and text-to-speech announcements
 * - Keyboard shortcuts (Space/Enter to draw)
 * - Persistent game state (survives page refreshes)
 * - Responsive layout with sidebar controls
 * - Internationalization support
 * 
 * **Game Flow:**
 * 1. Start game by uploading a `.bingoCards` file
 * 2. Draw numbers one at a time (animated)
 * 3. Validate player cards for line or full bingo
 * 4. View recent numbers and complete game history
 * 5. Restart or continue games across sessions
 * 
 * **Features:**
 * - State persistence via localStorage
 * - Smooth animations using Framer Motion
 * - Audio beeps and text-to-speech (locale-aware)
 * - Modal dialogs for card validation results
 * - Visual highlighting of drawn numbers
 * 
 * @example
 * ```tsx
 * // Used in the game page
 * import BingoGame from '../components/BingoGame';
 * 
 * export default function GamePage() {
 *   return <BingoGame />;
 * }
 * ```
 * 
 * @component
 * @see {@link checkLine} for line validation logic
 * @see {@link checkBingo} for full bingo validation logic
 * @see {@link parseBingoCards} for loading card data
 */
export default function BingoGame(): React.JSX.Element {
  const t = useTranslations('bingoGame');
  const locale = useLocale();
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
  const [bigScreenMode, setBigScreenMode] = useState(false);

  // Load game state from localStorage on component mount
  useEffect(() => {
    const storedGame = localStorage.getItem("bingoGame");
    const storedNumbers = localStorage.getItem("drawnNumbers");
    const storedBigScreenMode = localStorage.getItem("bigScreenMode");

    if (storedGame) {
      setBingoGame(JSON.parse(storedGame));
    }

    if (storedNumbers) {
      const numbers = JSON.parse(storedNumbers);
      setDrawnNumbers(numbers);
    }

    if (storedBigScreenMode) {
      setBigScreenMode(storedBigScreenMode === 'true');
    }
  }, []); // Added to initialize for localStorage

  // Save big screen mode preference to localStorage
  const toggleBigScreenMode = (): void => {
    const newMode = !bigScreenMode;
    setBigScreenMode(newMode);
    localStorage.setItem("bigScreenMode", String(newMode));
  };

  const showModal = (message: string, onConfirm?: () => void): void => {
    setModalMessage(message);
    setIsModalOpen(true);
    setConfirmAction(() => onConfirm || null);
  };

  const handleModalClose = (): void => {
    setIsModalOpen(false);
    setModalMessage("");
    setConfirmAction(null);
  };

  const handleStartGame = (): void => {
    if (bingoGame) {
      showModal(
        t('gameInProgress'),
        () => {
          startNewGame();
        }
      );
      return;
    }
    startNewGame();
  };

  const startNewGame = (): void => {
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
        showModal(t('uploadValidFile'));
      }
    };

    input.click();
  };

  const handleRestartGame = (): void => {
    setDrawnNumbers([]);
    localStorage.removeItem("drawnNumbers");
  };

  const handleDrawNumber = useCallback(() => {
    // Prevent overlapping animations
    if (isAnimating) {
      return;
    }

    if (!bingoGame) {
      showModal(t('pleaseStartGame'));
      return;
    }

    const availableNumbers = Array.from({ length: 89 }, (_, i) => i + 1).filter(
      (num) => !drawnNumbers.includes(num)
    );

    if (availableNumbers.length === 0) {
      showModal(t('allNumbersDrawn'));
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
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
        const utterance = new SpeechSynthesisUtterance(t('numberAnnouncement', { number: newNumber }));
        // Set language based on locale
        const ttsLang = locale === 'pt' ? 'pt-PT' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'en-US';
        utterance.lang = ttsLang;
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    }, 100);
    
    // Reset animation after it completes
    setTimeout(() => {
      setAnimatingNumber(null);
      setIsAnimating(false);
    }, 1000);
  }, [isAnimating, bingoGame, drawnNumbers, audioEnabled, ttsEnabled, t, locale]);

  // Keyboard shortcuts - must be after handleDrawNumber is defined
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent): void => {
      // Space or Enter to draw next ball
      if ((e.key === ' ' || e.key === 'Enter') && !isAnimating && bingoGame) {
        e.preventDefault();
        handleDrawNumber();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAnimating, bingoGame, handleDrawNumber]);

  const handleCheckLine = (cardNumberInput?: string): void => {
    const cardNumber = cardNumberInput || cardToValidate;
    if (!cardNumber || !bingoGame) {
      showModal(t('pleaseEnterCardNumber'));
      return;
    }

    const card = bingoGame.cards.find(
      (c) => c.cardNumber === parseInt(cardNumber)
    );
    if (!card) {
      showModal(t('cardNotFound'));
      return;
    }

    const hasLine = checkLine(card.numbers, drawnNumbers);
    if (hasLine) {
      setValidCard(card);
      setIsCardModalOpen(true);
      setCardToValidate("");
    } else {
      setValidCard(null);
      showModal(t('lineNotValid'));
    }
  };

  const handleCheckBingo = (cardNumberInput?: string): void => {
    const cardNumber = cardNumberInput || cardToValidate;
    if (!cardNumber || !bingoGame) {
      showModal(t('pleaseEnterCardNumber'));
      return;
    }

    const card = bingoGame.cards.find(
      (c) => c.cardNumber === parseInt(cardNumber)
    );
    if (!card) {
      showModal(t('cardNotFound'));
      return;
    }

    const hasBingo = checkBingo(card.numbers, drawnNumbers);
    if (hasBingo) {
      setValidCard(card);
      setIsCardModalOpen(true);
      setCardToValidate("");
      showModal(t('bingoValid'));
    } else {
      setValidCard(null);
      showModal(t('bingoNotValid'));
    }
  };

  return (
    <div className={`game-page ${bigScreenMode ? 'big-screen-mode' : ''}`}>
      <div className={styles.desktop_layout}>
        {/* Main content area - Numbers Grid */}
        <div className={styles.main_content} role="region" aria-label="Bingo number board">
          <div className={styles.game_controls}>
            <div className={styles.all_numbers}>
              <div className={styles.numbers_grid} role="list" aria-label="All bingo numbers from 1 to 89">
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
        <aside className={styles.sidebar} aria-label="Game controls and history">
          {/* Recent Numbers */}
          <AnimatePresence>
            {drawnNumbers.length > 0 && (
              <motion.div 
                className={styles.recent_numbers}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                role="region"
                aria-label="Recently drawn numbers"
              >
                <h3>{t('lastBalls')}</h3>
                <div className={styles.recent_list} role="list">
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
                      role="listitem"
                      aria-label={`Ball ${num}`}
                    >
                      {num}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game Controls */}
          <div className={styles.button_row} role="group" aria-label="Game control buttons">
            <motion.button 
              onClick={handleStartGame} 
              className="button-style"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              aria-label="Start a new bingo game"
            >
              {t('startGame')}
            </motion.button>
            <motion.button 
              onClick={handleRestartGame} 
              className="button-style"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              aria-label="Restart the current game"
              disabled={!bingoGame}
              aria-disabled={!bingoGame}
            >
              {t('restart')}
            </motion.button>
            <motion.button 
              onClick={handleDrawNumber} 
              className={`button-style ${styles.draw_button} ${isAnimating ? styles.disabled : ''}`}
              title={t('pressSpace')}
              whileHover={!isAnimating ? { scale: 1.05 } : {}}
              whileTap={!isAnimating ? { scale: 0.95 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              disabled={isAnimating || !bingoGame}
              aria-disabled={isAnimating || !bingoGame}
              aria-label={
                !bingoGame 
                  ? "Start a game to draw numbers" 
                  : isAnimating 
                  ? "Drawing number in progress"
                  : "Draw next bingo number (press Space or Enter)"
              }
              aria-keyshortcuts="Space Enter"
            >
              {t('nextBall')}
            </motion.button>
          </div>

          {/* Audio/TTS Settings */}
          <fieldset className={styles.settings_row} role="group" aria-label="Audio and voice settings">
            <legend className="sr-only">Audio and Voice Settings</legend>
            <label className={styles.setting_item}>
              <input 
                type="checkbox" 
                checked={audioEnabled}
                onChange={(e) => setAudioEnabled(e.target.checked)}
                aria-label="Enable audio feedback when drawing numbers"
              />
              <span>{t('audio')}</span>
            </label>
            <label className={styles.setting_item}>
              <input 
                type="checkbox" 
                checked={ttsEnabled}
                onChange={(e) => setTtsEnabled(e.target.checked)}
                aria-label="Enable text-to-speech announcements for drawn numbers"
              />
              <span>{t('tts')}</span>
            </label>
            <label className={styles.setting_item}>
              <input 
                type="checkbox" 
                checked={bigScreenMode}
                onChange={toggleBigScreenMode}
                aria-label="Enable big screen mode for projectors and large displays"
              />
              <span>{t('bigScreenMode')}</span>
            </label>
          </fieldset>

          {/* Validation Panel */}
          <section className={styles.validation_panel} aria-labelledby="validation-heading">
            <h3 id="validation-heading">{t('validateCard')}</h3>
            <div className={styles.validation_controls}>
              <motion.input 
                id="card-validation-input"
                type="number" 
                placeholder={t('cardNumberPlaceholder')}
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
                aria-label="Enter card number to validate"
                aria-describedby="validation-help"
              />
              <span id="validation-help" className="sr-only">
                Enter the card number and press Enter or click a validation button
              </span>
              <motion.button 
                onClick={() => handleCheckLine(cardToValidate)} 
                className="button-style"
                disabled={!cardToValidate}
                aria-disabled={!cardToValidate}
                whileHover={cardToValidate ? { scale: 1.05 } : {}}
                whileTap={cardToValidate ? { scale: 0.95 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                aria-label="Validate if card has a complete line"
              >
                {t('validateLine')}
              </motion.button>
              <motion.button 
                onClick={() => handleCheckBingo(cardToValidate)} 
                className="button-style"
                disabled={!cardToValidate}
                aria-disabled={!cardToValidate}
                whileHover={cardToValidate ? { scale: 1.05 } : {}}
                whileTap={cardToValidate ? { scale: 0.95 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                aria-label="Validate if card has a full bingo"
              >
                {t('validateBingo')}
              </motion.button>
            </div>
          </section>
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="card-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsCardModalOpen(false);
              }
            }}
          >
            <motion.div 
              className={`${styles.modal_box} ${styles.card_modal}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className={styles.modal_header}>
                <h3 id="card-modal-title">{t('cardNumberLabel', { number: validCard.cardTitle })}</h3>
                <motion.button 
                  onClick={() => setIsCardModalOpen(false)}
                  className={styles.close_button}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  aria-label="Close card details modal"
                >
                  ×
                </motion.button>
              </div>
              <div className="grid-container" role="grid" aria-label="Bingo card grid">
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
                    role="gridcell"
                    aria-label={
                      num === null 
                        ? "Empty cell" 
                        : drawnNumbers.includes(num)
                        ? `Number ${num}, marked`
                        : `Number ${num}, not marked`
                    }
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
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="alert-modal-message"
            onClick={(e) => {
              if (e.target === e.currentTarget && !confirmAction) {
                handleModalClose();
              }
            }}
          >
            <motion.div 
              className={styles.modal_box}
              initial={{ scale: 0.8, y: -50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <p id="alert-modal-message">{modalMessage}</p>
              {confirmAction ? (
                <div role="group" aria-label="Confirmation buttons">
                  <motion.button
                    onClick={() => {
                      confirmAction();
                      handleModalClose();
                    }}
                    className="button-style"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    aria-label="Confirm action"
                  >
                    {t('yes')}
                  </motion.button>
                  <motion.button 
                    onClick={handleModalClose} 
                    className="button-style"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    aria-label="Cancel action"
                  >
                    {t('no')}
                  </motion.button>
                </div>
              ) : (
                <motion.button 
                  onClick={handleModalClose} 
                  className="button-style"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  aria-label="Close message"
                >
                  {t('close')}
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
/**
 * Checks if a bingo card has achieved a valid line (row).
 * 
 * A valid line is achieved when all non-null numbers in any row
 * have been drawn. Each row consists of 9 cells (indexes 0-8, 9-17, 18-26),
 * with exactly 5 numbers and 4 null cells per row.
 * 
 * **Validation Logic:**
 * - Checks all three rows independently
 * - For each row, verifies that all non-null numbers appear in drawnNumbers
 * - Returns true if any row is completely marked
 * - Null cells don't need to be "marked" (they're always considered valid)
 * 
 * @param numbers - Array of 27 numbers representing the card (3 rows × 9 columns)
 * @param drawnNumbers - Array of numbers that have been drawn so far
 * @returns `true` if any complete line exists, `false` otherwise
 * 
 * @example
 * ```typescript
 * const card = [1, null, 3, null, 5, null, 7, null, 9, ...]; // 27 numbers
 * const drawn = [1, 3, 5, 7, 9];
 * console.log(checkLine(card, drawn)); // true - first row complete
 * 
 * const drawn2 = [1, 3, 5];
 * console.log(checkLine(card, drawn2)); // false - row incomplete
 * ```
 * 
 * @see {@link checkBingo} for full card validation
 */
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

/**
 * Checks if a bingo card has achieved a full bingo (all numbers marked).
 * 
 * A full bingo is achieved when all non-null numbers on the entire card
 * have been drawn. A standard bingo card has 15 numbers (5 per row × 3 rows)
 * and 12 null cells, for a total of 27 cells.
 * 
 * **Validation Logic:**
 * - Iterates through all 27 cells on the card
 * - For each non-null number, verifies it appears in drawnNumbers
 * - Returns true only if ALL numbers have been drawn
 * - Null cells are ignored (always considered valid)
 * 
 * @param numbers - Array of 27 numbers representing the card (3 rows × 9 columns)
 * @param drawnNumbers - Array of numbers that have been drawn so far
 * @returns `true` if all numbers are marked, `false` otherwise
 * 
 * @example
 * ```typescript
 * const card = [1, null, 3, null, 5, null, 7, null, 9, ...]; // 15 numbers total
 * const allNumbers = [1, 3, 5, 7, 9, ...]; // All 15 numbers from card
 * console.log(checkBingo(card, allNumbers)); // true - full bingo!
 * 
 * const someNumbers = [1, 3, 5];
 * console.log(checkBingo(card, someNumbers)); // false - incomplete
 * ```
 * 
 * @see {@link checkLine} for line/row validation
 */
function checkBingo(
  numbers: (number | null)[],
  drawnNumbers: number[]
): boolean {
  return numbers.every((num) => num === null || drawnNumbers.includes(num));
}
