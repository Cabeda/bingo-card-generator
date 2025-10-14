declare module 'next-pwa' {
  import { NextConfig } from 'next';

  interface PWAConfig {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    scope?: string;
    runtimeCaching?: Array<{
      urlPattern: RegExp;
      handler: string;
      options?: {
        cacheName?: string;
        expiration?: {
          maxEntries?: number;
          maxAgeSeconds?: number;
        };
        networkTimeoutSeconds?: number;
      };
    }>;
  }

  export default function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
}
