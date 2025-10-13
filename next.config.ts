import createNextIntlPlugin from 'next-intl/plugin';
import {NextConfig} from 'next';
import withPWAInit from 'next-pwa';

const withNextIntl = createNextIntlPlugin('./app/i18n.ts');

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Cache strategy
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {};

export default withNextIntl(withPWA(nextConfig));
