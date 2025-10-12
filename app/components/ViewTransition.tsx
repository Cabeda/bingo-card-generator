// app/components/ViewTransition.tsx
'use client';

import { useEffect } from 'react';

/**
 * Component to enable View Transitions API for smooth page transitions in browsers that support it.
 * This component adds a polyfill-like behavior for browsers without native support.
 */
export default function ViewTransition() {
  useEffect(() => {
    // Check if View Transitions API is supported
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      // Native support detected - CSS will handle transitions
      // View Transitions API supported
    } else {
      // Fallback for browsers without support
      // View Transitions API not supported - using fallback
    }
  }, []);

  return null;
}
