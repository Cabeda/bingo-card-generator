"use client";
import React from "react";
import { AnimatePresence, motion } from "motion/react";
import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog component for destructive or important actions.
 * 
 * Displays a modal dialog requesting user confirmation before proceeding
 * with an action. Useful for:
 * - Deleting data
 * - Overwriting existing content
 * - Starting a new game (clearing progress)
 * - Other irreversible operations
 * 
 * Features:
 * - Smooth animations with Framer Motion
 * - Customizable button text and styling
 * - Backdrop click to cancel
 * - Keyboard support (Escape to cancel)
 * - Accessible with proper ARIA attributes
 * 
 * @component
 * 
 * @example
 * ```tsx
 * <ConfirmDialog
 *   isOpen={showConfirm}
 *   title="Clear Cards"
 *   message="Are you sure you want to clear all generated cards? This action cannot be undone."
 *   confirmText="Clear"
 *   cancelText="Cancel"
 *   confirmVariant="danger"
 *   onConfirm={handleClear}
 *   onCancel={() => setShowConfirm(false)}
 * />
 * ```
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "primary",
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.JSX.Element {
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && isOpen) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
        >
          <motion.div
            className={styles.dialog}
            initial={{ scale: 0.8, y: -50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: -50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <h2 id="confirm-dialog-title" className={styles.title}>
              {title}
            </h2>
            <p id="confirm-dialog-message" className={styles.message}>
              {message}
            </p>
            <div className={styles.buttonContainer}>
              <motion.button
                className={styles.cancelButton}
                onClick={onCancel}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {cancelText}
              </motion.button>
              <motion.button
                className={`${styles.confirmButton} ${styles[confirmVariant]}`}
                onClick={onConfirm}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {confirmText}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
