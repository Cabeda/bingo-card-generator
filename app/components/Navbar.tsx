// components/Navbar.tsx
'use client';
import { useTranslations } from 'next-intl';
import { Link } from '../routing';
import styles from './Navbar.module.css';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSelector } from './LanguageSelector';

export default function Navbar() {
  const t = useTranslations('common');
  
  return (
    <nav className={styles.navbar}>
      <ul className={styles.navList}>
        <li className={styles.navItem}>
          <Link href="/" className={styles.navLink}>
            {t('cardGenerator')}
          </Link>
        </li>
        <li className={styles.navItem}>
          <Link href="/game" className={styles.navLink}>
            {t('playGame')}
          </Link>
        </li>
        <li className={styles.navItem}>
          <LanguageSelector />
        </li>
        <li className={styles.navItem}>
          <ThemeToggle />
        </li>
      </ul>
    </nav>
  );
}