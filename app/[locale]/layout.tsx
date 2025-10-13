// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../routing';
import Navbar from "../components/Navbar";
import ViewTransition from "../components/ViewTransition";
import "../globals.css";
import type { Metadata, Viewport } from 'next';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Bingo Card Generator',
  description: 'Generate and play bingo cards offline',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bingo Cards',
  },
};

export const viewport: Viewport = {
  themeColor: '#ff007f',
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Validate locale
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ViewTransition />
          <Navbar />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
