import createNextIntlPlugin from "next-intl/plugin";
import { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./app/i18n.ts");

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Cache strategy
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "offlineCache",
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  typescript: { tsconfigPath: "./tsconfig.app.json" },
};

export default withNextIntl(withPWA(withBundleAnalyzer(nextConfig)));
