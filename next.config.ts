import createNextIntlPlugin from "next-intl/plugin";
import { NextConfig } from "next";
import { OFFLINE_ROUTES } from "./app/utils/offlineRoutes";

const withNextIntl = createNextIntlPlugin("./app/i18n.ts");

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // The UI owns registration and verifies the installed cache before reporting readiness.
  register: false,
  skipWaiting: false,
  dynamicStartUrl: false,
  reloadOnOnline: false,
  manifestTransforms: [async (entries: { url: string; revision: string | null }[]) => ({
    manifest: [
      ...entries,
      ...OFFLINE_ROUTES.filter(url => url !== "/").map(url => ({ url, revision: null })),
    ],
    warnings: [],
  })],
  swSrc: 'worker/service-worker.js',
  customWorkerDir: 'pwa-custom',

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
