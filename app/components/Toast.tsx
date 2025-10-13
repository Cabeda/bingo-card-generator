"use client";
import React from "react";
import { AnimatePresence, motion } from "motion/react";
import styles from "./Toast.module.css";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

/**
 * Toast notification component for displaying temporary messages.
 * 
 * Provides visual feedback for user actions with different types:
 * - success: Green, checkmark icon
 * - error: Red, X icon
 * - warning: Orange, warning icon
 * - info: Blue, info icon
 * 
 * Features:
 * - Auto-dismisses after duration (default 3s)
 * - Manual dismiss with close button
 * - Smooth animations with Framer Motion
 * - Accessible with proper ARIA attributes
 * 
 * @component
 */
export function ToastItem({ toast, onClose }: ToastProps): React.JSX.Element {
  const { id, message, type, duration = 3000 } = toast;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getIcon = (): string => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "info":
        return "ℹ";
      default:
        return "ℹ";
    }
  };

  return (
    <motion.div
      className={`${styles.toast} ${styles[type]}`}
      initial={{ opacity: 0, y: -50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      layout
      role="alert"
      aria-live={type === "error" ? "assertive" : "polite"}
    >
      <span className={styles.icon}>{getIcon()}</span>
      <span className={styles.message}>{message}</span>
      <button
        className={styles.closeButton}
        onClick={() => onClose(id)}
        aria-label="Close notification"
      >
        ×
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

/**
 * Container for displaying multiple toast notifications.
 * 
 * Positions toasts in the top-right corner and stacks them vertically.
 * Uses AnimatePresence for smooth enter/exit animations.
 * 
 * @component
 */
export function ToastContainer({ toasts, onClose }: ToastContainerProps): React.JSX.Element {
  return (
    <div className={styles.container}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}
