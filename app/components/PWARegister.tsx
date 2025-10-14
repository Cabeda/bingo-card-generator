'use client';

import { useEffect } from 'react';

/**
 * Component for registering and managing the service worker.
 * 
 * Handles:
 * - Service worker registration
 * - Update detection and automatic updates
 * - Background sync registration
 * - Service worker lifecycle events
 * 
 * @component
 */
export function PWARegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('Service Worker registered:', registration);

          // Check for service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available
                  console.log('New service worker available');
                }
              });
            }
          });

          // Register for background sync if supported
          if ('sync' in registration) {
            console.log('Background sync is supported');
            // Background sync will be triggered by other parts of the app as needed
          }

          // Listen for messages from the service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('Message from service worker:', event.data);
            
            if (event.data && event.data.type === 'CACHE_UPDATED') {
              console.log('Cache has been updated');
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });

      // Handle page visibility changes for background sync
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          // Check for updates when page becomes visible
          navigator.serviceWorker.ready.then((registration) => {
            registration.update();
          });
        }
      });
    }
  }, []);

  return null;
}
