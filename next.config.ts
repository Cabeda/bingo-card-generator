import createNextIntlPlugin from 'next-intl/plugin';
import {NextConfig} from 'next';

const withNextIntl = createNextIntlPlugin('./app/i18n.ts');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa')({
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/**
 * Content Security Policy configuration
 * Defines strict security headers to prevent XSS and other injection attacks
 * 
 * Directives explained:
 * - default-src 'self': Only allow resources from same origin by default
 * - script-src: Allow scripts from same origin, inline scripts (React), and eval (required by Next.js and jsPDF)
 * - style-src: Allow styles from same origin and inline styles (React components use inline styles)
 * - img-src: Allow images from same origin, blob URLs (PDF generation), and data URLs
 * - font-src: Allow fonts from same origin only (we use self-hosted fonts)
 * - connect-src: Allow connections to same origin (API calls, if any)
 * - worker-src: Allow service workers from same origin and blob URLs (PWA support)
 * - manifest-src: Allow manifest from same origin (PWA manifest)
 * - object-src: Disallow plugins like Flash
 * - base-uri: Restrict base URL to same origin
 * - form-action: Restrict form submissions to same origin
 * - frame-ancestors: Prevent this site from being embedded in iframes
 * - upgrade-insecure-requests: Upgrade HTTP to HTTPS automatically
 */
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  connect-src 'self';
  worker-src 'self' blob:;
  manifest-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(withPWA(withBundleAnalyzer(nextConfig)));
