"use client";
import React, { createContext, useCallback, useContext, useState } from "react";
import { Toast, ToastContainer, ToastType } from "./Toast";

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Hook to access toast notification functionality.
 * 
 * Provides methods to display different types of toast notifications:
 * - showToast: Generic method with custom type
 * - showSuccess: Green success toast
 * - showError: Red error toast
 * - showWarning: Orange warning toast
 * - showInfo: Blue info toast
 * 
 * @throws {Error} If used outside ToastProvider
 * 
 * @example
 * ```tsx
 * const { showSuccess, showError } = useToast();
 * 
 * // Show success notification
 * showSuccess("Cards generated successfully!");
 * 
 * // Show error with custom duration
 * showError("Failed to generate PDF", 5000);
 * ```
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for toast notifications.
 * 
 * Wraps the application or part of it to provide toast notification
 * functionality through the useToast hook. Manages toast state and
 * displays the ToastContainer.
 * 
 * @component
 * 
 * @example
 * ```tsx
 * // In layout.tsx or root component
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 * ```
 */
export function ToastProvider({ children }: ToastProviderProps): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info", duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { id, message, type, duration };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const showSuccess = useCallback((message: string, duration = 3000) => {
    showToast(message, "success", duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration = 5000) => {
    showToast(message, "error", duration);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration = 4000) => {
    showToast(message, "warning", duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration = 3000) => {
    showToast(message, "info", duration);
  }, [showToast]);

  const value: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}
