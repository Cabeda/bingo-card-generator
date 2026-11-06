'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { prepareOffline } from '../utils/offline';
import styles from './OfflineStatus.module.css';

type Phase = 'preparing' | 'ready' | 'unavailable';

export function PWARegister() {
  const t = useTranslations('offline');
  const [phase, setPhase] = useState<Phase | null>(null);
  const [online, setOnline] = useState(true);
  const retry = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator) || !('caches' in window)) {
      setPhase('unavailable');
      setOnline(navigator.onLine);
      return;
    }
    let request = 0;
    const check = async () => {
      const current = ++request;
      setPhase('preparing');
      // Discover updates without delaying verification of an already usable offline cache.
      if (navigator.onLine) {
        void navigator.serviceWorker.getRegistration('/').then(registration => registration?.update()).catch(() => {});
      }
      try {
        await prepareOffline();
        if (current === request) setPhase('ready');
      } catch {
        if (current === request) setPhase('unavailable');
      }
    };
    const controller = () => { void check(); };
    retry.current = check;
    const connection = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void check();
    };
    const visibility = () => {
      if (document.visibilityState === 'visible') void check();
    };
    setOnline(navigator.onLine);
    void check();
    navigator.serviceWorker.addEventListener('controllerchange', controller);
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      ++request;
      navigator.serviceWorker.removeEventListener('controllerchange', controller);
      window.removeEventListener('online', connection);
      window.removeEventListener('offline', connection);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  if (phase === null) return null;
  if (phase !== 'unavailable') return <span hidden data-offline-state={phase} />;
  return (
    <div className={styles.status} role="status" aria-live="polite" data-offline-state={phase}>
      <span>{t('unavailable')}</span>
      {online && retry.current && (
        <button className={styles.button} type="button" onClick={retry.current}>{t('retry')}</button>
      )}
    </div>
  );
}
