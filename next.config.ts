import createNextIntlPlugin from 'next-intl/plugin';
import {NextConfig} from 'next';

const withNextIntl = createNextIntlPlugin('./app/i18n.ts');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Enable background sync
  scope: '/',
  // Cache strategy with improved offline-first behavior
  runtimeCaching: [
    {
      urlPattern: /^https?.*\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /\.(?:js|css|woff|woff2|ttf|otf)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 10,
      },
    },
  ],
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {};

export default withNextIntl(withPWA(withBundleAnalyzer(nextConfig)));
