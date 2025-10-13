// app/components/ClientErrorBoundary.tsx
'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface ClientErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Client-side wrapper for ErrorBoundary to be used in server components.
 * This component allows the ErrorBoundary to be used in the layout.tsx
 * which is a server component by default.
 */
export function ClientErrorBoundary({ children }: ClientErrorBoundaryProps): React.JSX.Element {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}

export default ClientErrorBoundary;
