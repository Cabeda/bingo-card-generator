import React from 'react';
import { render, screen } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import requestConfig from './i18n';
import { Link, redirect, routing, usePathname, useRouter } from './routing';
import LocaleLayout, { generateStaticParams, metadata, viewport } from './[locale]/layout';
import GeneratePage from './[locale]/page';
import CardsPage from './[locale]/cards/page';
import GamePage from './[locale]/game/page';
import proxy, { config } from '../proxy';

jest.mock('next/navigation', () => ({ notFound: jest.fn(() => { throw new Error('not found'); }) }));
jest.mock('next-intl/server', () => ({ getRequestConfig: (callback: unknown) => callback, getMessages: jest.fn(async () => ({ greeting: 'Hello' })) }));
jest.mock('next-intl/routing', () => ({ defineRouting: (config: unknown) => config }));
jest.mock('next-intl/navigation', () => ({ createNavigation: () => ({ Link: 'a', redirect: 'redirect', usePathname: 'pathname', useRouter: 'router' }) }));
jest.mock('next-intl/middleware', () => ({ __esModule: true, default: (config: unknown) => ({ routing: config }) }));
jest.mock('next-intl', () => ({ NextIntlClientProvider: 'intl-provider' }));
jest.mock('./components/PWARegister', () => ({ PWARegister: 'pwa-register' }));
jest.mock('./components/ViewTransition', () => ({ __esModule: true, default: 'view-transition' }));
jest.mock('./components/ToastProvider', () => ({ ToastProvider: 'toast-provider' }));
jest.mock('./components/ThemeProvider', () => ({ ThemeProvider: 'theme-provider' }));
jest.mock('./components/ClientErrorBoundary', () => ({ ClientErrorBoundary: 'error-boundary' }));
jest.mock('./components/EventWorkspace/EventWorkspace', () => ({ EventWorkspace: ({ entry }: { entry: string }) => <div>Workspace: {entry}</div> }));
jest.mock('next-intl/plugin', () => ({ __esModule: true, default: jest.fn(() => (config: unknown) => config) }));
jest.mock('next-pwa', () => jest.fn(() => (config: unknown) => config));
jest.mock('@next/bundle-analyzer', () => jest.fn(() => (config: unknown) => config));

const previousReact = (globalThis as any).React;
beforeAll(() => { (globalThis as any).React = React; });
afterAll(() => { if (previousReact === undefined) delete (globalThis as any).React; else (globalThis as any).React = previousReact; });

const resolveConfig = requestConfig as unknown as (request: { requestLocale: Promise<string | undefined> }) => Promise<{ locale: string; messages: unknown }>;

it.each(['en', 'pt', 'es', 'fr'])('loads messages and lays out supported locale %s', async (locale) => {
  const resolved = await resolveConfig({ requestLocale: Promise.resolve(locale) });
  expect(resolved.locale).toBe(locale);
  expect(resolved.messages).toEqual(require(`../messages/${locale}.json`));
  const child = <p>Event content</p>;
  const layout = await LocaleLayout({ children: child, params: Promise.resolve({ locale }) });
  expect(layout.type).toBe('html');
  expect(layout.props).toEqual(expect.objectContaining({ lang: locale, suppressHydrationWarning: true }));
  const intl = layout.props.children.props.children;
  expect(intl.type).toBe('intl-provider');
  expect(intl.props.messages).toEqual({ greeting: 'Hello' });
  const toast = intl.props.children;
  expect(toast.type).toBe('toast-provider');
  const theme = toast.props.children;
  expect(theme.type).toBe('theme-provider');
  const boundary = theme.props.children;
  expect(boundary.type).toBe('error-boundary');
  const [pwa, transition, skip, main] = boundary.props.children;
  expect(pwa.type).toBe('pwa-register');
  expect(transition.type).toBe('view-transition');
  expect(skip.props.href).toBe('#main-content');
  expect(main.props.id).toBe('main-content');
  expect(main.props.children).toBe(child);
  expect(getMessages).toHaveBeenCalled();
});

it.each([undefined, '', 'de'])('rejects an unsupported request locale (%s)', async (locale) => {
  await expect(resolveConfig({ requestLocale: Promise.resolve(locale) })).rejects.toThrow('not found');
  expect(notFound).toHaveBeenCalled();
});
it('rejects an unsupported layout locale', async () => {
  await expect(LocaleLayout({ children: null, params: Promise.resolve({ locale: 'de' }) })).rejects.toThrow('not found');
});
it('exposes routing, static locales, and application metadata consistently', () => {
  expect(generateStaticParams()).toEqual(['en', 'pt', 'es', 'fr'].map(locale => ({ locale })));
  expect(routing.defaultLocale).toBe('pt');
  expect([Link, redirect, usePathname, useRouter]).toEqual(['a', 'redirect', 'pathname', 'router']);
  expect(proxy).toEqual({ routing });
  expect(config.matcher).toEqual(['/', '/(pt|en|es|fr)/:path*']);
  expect(metadata).toEqual(expect.objectContaining({ title: 'Bingo Card Generator', manifest: '/manifest.json' }));
  expect(viewport.themeColor).toBe('#ff007f');
});
it.each([[GeneratePage, 'generate'], [CardsPage, 'print'], [GamePage, 'host']] as const)('opens the corresponding workspace entry (%s)', (Page, entry) => {
  render(<Page />);
  expect(screen.getByText(`Workspace: ${entry}`)).toBeInTheDocument();
});

it.each([
  ['development', undefined, undefined, true, false, '.next'],
  ['production', 'true', 'custom-build', false, true, 'custom-build'],
] as const)('configures build plugins for %s', (nodeEnv, analyze, buildDir, disabled, enabled, distDir) => {
  const previous = { NODE_ENV: process.env.NODE_ENV, ANALYZE: process.env.ANALYZE, NEXT_BUILD_DIR: process.env.NEXT_BUILD_DIR };
  Object.assign(process.env, { NODE_ENV: nodeEnv });
  if (analyze === undefined) delete process.env.ANALYZE; else process.env.ANALYZE = analyze;
  if (buildDir === undefined) delete process.env.NEXT_BUILD_DIR; else process.env.NEXT_BUILD_DIR = buildDir;
  try {
    jest.isolateModules(() => {
      const nextConfig = require('../next.config').default;
      expect(nextConfig).toEqual({ distDir, typescript: { tsconfigPath: './tsconfig.app.json' } });
      expect(require('next-pwa')).toHaveBeenLastCalledWith(expect.objectContaining({ dest: 'public', disable: disabled, register: true, skipWaiting: true }));
      expect(require('@next/bundle-analyzer')).toHaveBeenLastCalledWith({ enabled });
      expect(require('next-intl/plugin').default).toHaveBeenLastCalledWith('./app/i18n.ts');
    });
  } finally {
    for (const [name, value] of Object.entries(previous)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
});
