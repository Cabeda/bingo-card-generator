// components/ThemeToggle.tsx
'use client';

import { useEffect, useState } from 'react';
import styles from './ThemeToggle.module.css';

type Theme = 'light' | 'dark' | 'system';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  // Only run on client side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
      setTheme(stored);
      applyTheme(stored);
    } else {
      // Default to system preference
      applyTheme('system');
    }
  }, []);

  const applyTheme = (newTheme: Theme): void => {
    if (newTheme === 'system') {
      // Remove data-theme attribute to let system preference take over
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  const toggleTheme = (): void => {
    let newTheme: Theme;
    
    if (theme === 'system') {
      newTheme = 'light';
    } else if (theme === 'light') {
      newTheme = 'dark';
    } else {
      newTheme = 'system';
    }
    
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    
    // Announce theme change to screen readers
    announceThemeChange(newTheme);
  };

  const announceThemeChange = (newTheme: Theme): void => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = `Theme changed to ${newTheme} mode`;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  };

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button className={styles.themeToggle} aria-label="Toggle theme" disabled>
        <span className={styles.icon}>🌓</span>
      </button>
    );
  }

  const getIcon = (): string => {
    if (theme === 'dark') return '☀️';
    if (theme === 'light') return '🌙';
    return '🌓'; // system
  };

  const getLabel = (): string => {
    if (theme === 'dark') return 'Switch to light mode';
    if (theme === 'light') return 'Switch to system mode';
    return 'Switch to dark mode';
  };

  return (
    <button
      onClick={toggleTheme}
      className={styles.themeToggle}
      aria-label={getLabel()}
      title={getLabel()}
    >
      <span className={styles.icon}>{getIcon()}</span>
    </button>
  );
}
