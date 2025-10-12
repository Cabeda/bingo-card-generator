// components/Navbar.tsx
'use client';
import React from 'react';
import Link from 'next/link';
import styles from './Navbar.module.css';

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
      </ul>
    </nav>
  );
}