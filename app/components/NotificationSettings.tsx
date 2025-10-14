'use client';

import { useTranslations } from 'next-intl';
import { usePushNotifications } from '../hooks/usePushNotifications';
import styles from './NotificationSettings.module.css';

/**
 * Component for managing push notification settings.
 * 
 * Provides UI controls for:
 * - Requesting notification permissions
 * - Subscribing/unsubscribing from push notifications
 * - Displaying current notification status
 * 
 * @component
 * 
 * @example
 * ```tsx
 * // In a settings page or menu
 * <NotificationSettings />
 * ```
 */
export function NotificationSettings(): React.JSX.Element {
  const t = useTranslations('Notifications');
  const {
    permission,
    isSupported,
    isSubscribed,
    requestPermission,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className={styles.container}>
        <p className={styles.unsupported}>
          {t('notSupported')}
        </p>
      </div>
    );
  }

  const handleEnableNotifications = async (): Promise<void> => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (granted) {
        await subscribe();
      }
    } else {
      await subscribe();
    }
  };

  const handleDisableNotifications = async (): Promise<void> => {
    await unsubscribe();
  };

  return (
    <div className={styles.container}>
      <div className={styles.status}>
        <h3 className={styles.title}>
          {t('title', { default: 'Push Notifications' })}
        </h3>
        <p className={styles.description}>
          {t('description', { default: 'Get notified about game updates and important events' })}
        </p>
        
        <div className={styles.statusInfo}>
          <span className={styles.statusLabel}>
            {t('status', { default: 'Status:' })}
          </span>
          <span className={`${styles.statusValue} ${styles[permission]}`}>
            {permission === 'granted' 
              ? t('permissionGranted', { default: 'Enabled' })
              : permission === 'denied'
              ? t('permissionDenied', { default: 'Blocked' })
              : t('permissionDefault', { default: 'Not enabled' })}
          </span>
        </div>

        {permission === 'denied' && (
          <p className={styles.deniedMessage}>
            {t('deniedHelp', { 
              default: 'Notifications are blocked. Please enable them in your browser settings.' 
            })}
          </p>
        )}
      </div>

      <div className={styles.actions}>
        {permission !== 'denied' && (
          <>
            {!isSubscribed ? (
              <button
                onClick={handleEnableNotifications}
                className={`${styles.button} ${styles.enable}`}
              >
                {t('enable', { default: 'Enable Notifications' })}
              </button>
            ) : (
              <button
                onClick={handleDisableNotifications}
                className={`${styles.button} ${styles.disable}`}
              >
                {t('disable', { default: 'Disable Notifications' })}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
