// app/components/ErrorBoundary.tsx
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component for catching and handling React component errors.
 * 
 * This component wraps other components to provide graceful error handling:
 * - Catches JavaScript errors anywhere in the child component tree
 * - Logs error information for debugging
 * - Displays a fallback UI instead of crashing the whole app
 * - Allows users to recover by trying again (reset state)
 * 
 * **Usage:**
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 * 
 * **Custom Fallback:**
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 * 
 * @component
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state when an error is caught.
   * This lifecycle method is called during the "render" phase.
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error details for debugging.
   * This lifecycle method is called during the "commit" phase.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console for development
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Store error info in state for display
    this.setState({
      errorInfo,
    });

    // TODO: In production, send to error tracking service (e.g., Sentry)
    // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  /**
   * Reset error state to allow user to try again.
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto',
        }}>
          <div style={{
            backgroundColor: '#fee',
            border: '2px solid #fcc',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '20px',
          }}>
            <h2 style={{
              color: '#c00',
              marginBottom: '16px',
              fontSize: '24px',
            }}>
              ⚠️ Something went wrong
            </h2>
            <p style={{
              color: '#666',
              marginBottom: '20px',
              fontSize: '16px',
            }}>
              We encountered an unexpected error. Don&apos;t worry, your data should be safe.
            </p>
            <button
              onClick={this.handleReset}
              style={{
                backgroundColor: '#ff007f',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '12px 24px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Try Again
            </button>
          </div>
          
          {/* Show error details in development */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{
              textAlign: 'left',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '16px',
              fontSize: '14px',
            }}>
              <summary style={{
                cursor: 'pointer',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}>
                Error Details (Development Only)
              </summary>
              <pre style={{
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: '#d00',
              }}>
                {this.state.error.toString()}
              </pre>
              {this.state.errorInfo && (
                <pre style={{
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  marginTop: '8px',
                  color: '#666',
                }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
