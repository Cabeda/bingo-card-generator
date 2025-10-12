'use client';

import { useLocale } from 'next-intl';
import { routing, usePathname, useRouter, type Locale } from '../routing';
import styles from './LanguageSelector.module.css';

const languageNames: Record<Locale, string> = {
  en: '🇬🇧 EN',
  pt: '🇵🇹 PT',
  es: '🇪🇸 ES',
  fr: '🇫🇷 FR'
};

export function LanguageSelector() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: Locale) => {
    // Store language preference in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred-locale', newLocale);
    }

    // Use the router from next-intl which handles locale switching properly
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className={styles.languageSelector}>
      <select
        value={locale}
        onChange={(e) => handleLanguageChange(e.target.value as Locale)}
        className={styles.select}
        aria-label="Select language"
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {languageNames[loc]}
          </option>
        ))}
      </select>
    </div>
  );
}
