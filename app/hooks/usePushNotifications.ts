'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Permission status for push notifications
 */
export type NotificationPermission = 'default' | 'granted' | 'denied';

/**
 * Hook return type
 */
interface UsePushNotificationsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  isSubscribed: boolean;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendNotification: (title: string, options?: NotificationOptions) => Promise<boolean>;
}

/**
 * Custom hook for managing push notifications and service worker subscriptions.
 * 
 * This hook provides a comprehensive interface for:
 * - Checking notification support and permission status
 * - Requesting notification permissions from the user
 * - Managing push notification subscriptions
 * - Sending local notifications
 * 
 * @returns Object containing notification state and control functions
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { 
 *     permission, 
 *     isSupported, 
 *     requestPermission,
 *     sendNotification 
 *   } = usePushNotifications();
 * 
 *   const handleNotify = async () => {
 *     if (permission === 'granted') {
 *       await sendNotification('Hello!', { body: 'This is a test notification' });
 *     } else {
 *       await requestPermission();
 *     }
 *   };
 * 
 *   return <button onClick={handleNotify}>Notify Me</button>;
 * }
 * ```
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);

  // Check if notifications are supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
      }
    }
  }, []);

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async (): Promise<void> => {
      if (!isSupported || typeof window === 'undefined') return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(subscription !== null);
      } catch (error) {
        console.error('Error checking subscription:', error);
        setIsSubscribed(false);
      }
    };

    checkSubscription();
  }, [isSupported]);

  /**
   * Request notification permission from the user
   * @returns Promise<boolean> - true if permission granted, false otherwise
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Notifications are not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  /**
   * Subscribe to push notifications
   * @returns Promise<boolean> - true if successfully subscribed, false otherwise
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || permission !== 'granted') {
      console.warn('Cannot subscribe: notifications not supported or permission not granted');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create a new subscription
        // Note: In production, you would use a VAPID public key here
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: undefined, // Add VAPID key in production
        });
      }

      setIsSubscribed(true);
      
      // In a real application, you would send this subscription to your backend
      console.log('Push subscription:', subscription);
      
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    }
  }, [isSupported, permission]);

  /**
   * Unsubscribe from push notifications
   * @returns Promise<boolean> - true if successfully unsubscribed, false otherwise
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        setIsSubscribed(false);
        console.log('Unsubscribed from push notifications');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }, [isSupported]);

  /**
   * Send a local notification
   * @param title - Notification title
   * @param options - Notification options (body, icon, etc.)
   * @returns Promise<boolean> - true if notification sent, false otherwise
   */
  const sendNotification = useCallback(async (
    title: string,
    options?: NotificationOptions
  ): Promise<boolean> => {
    if (!isSupported || permission !== 'granted') {
      console.warn('Cannot send notification: not supported or permission not granted');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Send notification through service worker
      await registration.showNotification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        ...options,
      });
      
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }, [isSupported, permission]);

  return {
    permission,
    isSupported,
    isSubscribed,
    requestPermission,
    subscribe,
    unsubscribe,
    sendNotification,
  };
}
