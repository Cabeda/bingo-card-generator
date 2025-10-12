// components/Navbar.tsx
'use client';
import Link from 'next/link';
import styles from './Navbar.module.css';
import { ThemeToggle } from './ThemeToggle';

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <ul className={styles.navList}>
        <li className={styles.navItem}>
          <Link href="/" className={styles.navLink}>
            Card Generator
          </Link>
        </li>
        <li className={styles.navItem}>
          <Link href="/game" className={styles.navLink}>
            Play Game
          </Link>
        </li>
        <li className={styles.navItem}>
          <ThemeToggle />
        </li>
      </ul>
    </nav>
  );
}