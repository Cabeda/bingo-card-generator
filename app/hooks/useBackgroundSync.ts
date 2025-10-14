'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Hook return type for background sync management
 */
interface UseBackgroundSyncReturn {
  isSupported: boolean;
  registerSync: (tag: string) => Promise<boolean>;
  isSyncing: boolean;
}

/**
 * Custom hook for managing background sync operations.
 * 
 * Background sync allows the app to defer actions until the user has a stable connection,
 * ensuring that important operations (like saving game state or uploading data) complete
 * even if the user closes the app or loses connectivity temporarily.
 * 
 * @returns Object containing sync state and control functions
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isSupported, registerSync } = useBackgroundSync();
 * 
 *   const saveGameState = async () => {
 *     // Save to local storage
 *     localStorage.setItem('gameState', JSON.stringify(state));
 *     
 *     // Register for background sync to upload when online
 *     if (isSupported) {
 *       await registerSync('sync-game-state');
 *     }
 *   };
 * 
 *   return <button onClick={saveGameState}>Save Game</button>;
 * }
 * ```
 */
export function useBackgroundSync(): UseBackgroundSyncReturn {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Check if background sync is supported
  useEffect(() => {
    const checkSupport = async (): Promise<void> => {
      if (typeof window === 'undefined') {
        setIsSupported(false);
        return;
      }

      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const supported = 'sync' in registration;
          setIsSupported(supported);
        } catch (error) {
          console.error('Error checking background sync support:', error);
          setIsSupported(false);
        }
      } else {
        setIsSupported(false);
      }
    };

    checkSupport();
  }, []);

  // Listen for sync events
  useEffect(() => {
    if (!isSupported || typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent): void => {
      if (event.data && event.data.type === 'SYNC_STARTED') {
        setIsSyncing(true);
      } else if (event.data && event.data.type === 'SYNC_COMPLETED') {
        setIsSyncing(false);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [isSupported]);

  /**
   * Register a background sync with the given tag
   * 
   * @param tag - Unique identifier for this sync operation
   * @returns Promise<boolean> - true if registration successful, false otherwise
   */
  const registerSync = useCallback(async (tag: string): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Background sync is not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('sync' in registration) {
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(tag);
        console.log(`Background sync registered: ${tag}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error registering background sync:', error);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    registerSync,
    isSyncing,
  };
}
