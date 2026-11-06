/** Every entry point must be available before an installation is offline-ready. */
export const SUPPORTED_LOCALES = ['en', 'pt', 'es', 'fr'] as const;
export const OFFLINE_ROUTES = [
  '/',
  ...SUPPORTED_LOCALES.flatMap(locale => ['', '/cards', '/game'].map(path => `/${locale}${path}`)),
];
