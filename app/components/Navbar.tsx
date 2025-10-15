// components/Navbar.tsx
"use client";
import { Link } from "../routing";
import { useTranslations } from "next-intl";
import React from "react";
import styles from "./Navbar.module.css";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSelector } from "./LanguageSelector";

export default function Navbar(): React.JSX.Element {
  const t = useTranslations("common");

  return (
    <nav className={styles.navbar} aria-label="Main navigation">
      <ul className={styles.navList} role="list">
        <li className={styles.navItem}>
          <Link href="/" className={styles.navLink} aria-label="Navigate to card generator page">
            {t("cardGenerator")}
          </Link>
        </li>
        <li className={styles.navItem}>
          <Link href="/game" className={styles.navLink} aria-label="Navigate to play game page">
            {t("playGame")}
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
