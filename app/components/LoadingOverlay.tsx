"use client";
import React from "react";
import { AnimatePresence, motion } from "motion/react";
import styles from "./LoadingOverlay.module.css";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number;
  showProgress?: boolean;
  subMessage?: string;
  onCancel?: () => void;
  cancelText?: string;
}

/**
 * Loading overlay component for blocking user interaction during operations.
 * 
 * Displays a full-screen overlay with:
 * - Animated spinner
 * - Optional message
 * - Optional progress bar
 * - Optional sub-message (e.g., batch info)
 * - Optional cancel button
 * 
 * Prevents user interaction with underlying content while visible.
 * 
 * Features:
 * - Smooth fade animations
 * - Responsive design
 * - Accessible with proper ARIA attributes
 * - Optional progress bar for long operations
 * - Optional cancel functionality
 * 
 * @component
 * 
 * @example
 * ```tsx
 * <LoadingOverlay
 *   isVisible={isGenerating}
 *   message="Generating cards..."
 *   progress={50}
 *   showProgress={true}
 *   subMessage="Processing batch 2 of 5"
 *   onCancel={() => setCancelFlag(true)}
 *   cancelText="Cancel"
 * />
 * ```
 */
export function LoadingOverlay({
  isVisible,
  message = "Loading...",
  progress,
  showProgress = false,
  subMessage,
  onCancel,
  cancelText = "Cancel",
}: LoadingOverlayProps): React.JSX.Element {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Loading"
        >
          <motion.div
            className={styles.content}
            initial={{ scale: 0.8, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: -20 }}
          >
            {/* Spinner */}
            <div className={styles.spinner} />

            {/* Message */}
            <p className={styles.message}>{message}</p>

            {/* Progress bar */}
            {showProgress && progress !== undefined && (
              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <motion.div
                    className={styles.progressFill}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className={styles.progressText}>{Math.round(progress)}%</p>
              </div>
            )}

            {/* Sub-message */}
            {subMessage && <p className={styles.subMessage}>{subMessage}</p>}

            {/* Cancel button */}
            {onCancel && (
              <button
                className={styles.cancelButton}
                onClick={onCancel}
                aria-label="Cancel operation"
              >
                {cancelText}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
