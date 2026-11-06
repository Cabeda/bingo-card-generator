import { createServer, request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, test } from '@playwright/test';

function comparableSession(raw: string) {
  const session = JSON.parse(raw);
  session.game.cards = session.game.cards.map((card: { cardNumber: number; numbers: unknown[] }) => ({ cardNumber: card.cardNumber, numbers: card.numbers }));
  return session;
}

for (const kind of ['incomplete cache', 'legacy protocol']) {
  test(`replaces an old worker with ${kind} without resetting the game`, async ({ page, context }) => {
    let legacy = true;
    const server = createServer((incoming, outgoing) => {
      if (incoming.url === '/bootstrap') {
        outgoing.setHeader('Content-Type', 'text/html');
        outgoing.end('<!doctype html><title>Old installation fixture</title>');
      } else if (incoming.url === '/retired.css') {
        outgoing.writeHead(404); outgoing.end('Not found');
      } else if (legacy && incoming.url === '/sw.js') {
        outgoing.setHeader('Content-Type', 'application/javascript');
        outgoing.setHeader('Cache-Control', 'no-store');
        outgoing.end(`
          self.addEventListener('install', event => event.waitUntil((async () => {
            const cache = await caches.open('old-bingo-cache');
            await cache.put('/old-page', new Response('<link rel="stylesheet" href="/retired.css"><script src="/old.js"></script>', {headers: {'Content-Type':'text/html'}}));
            await self.skipWaiting();
          })()));
          self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
          ${kind === 'incomplete cache' ? `self.addEventListener('message', event => {
            if (event.data?.type === 'OFFLINE_CACHE_INFO') event.ports[0].postMessage({cacheName:'old-bingo-cache', keys:{
              [self.location.origin+'/en']:self.location.origin+'/old-page',
              [self.location.origin+'/retired.css']:self.location.origin+'/retired.css',
              [self.location.origin+'/old.js']:self.location.origin+'/old.js'
            }});
          });` : ''}
        `);
      } else {
        const upstream = request({ hostname: '127.0.0.1', port: 3100, path: incoming.url, method: incoming.method, headers: incoming.headers }, response => {
          outgoing.writeHead(response.statusCode!, response.headers);
          response.pipe(outgoing);
        });
        incoming.pipe(upstream);
      }
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      await page.goto(`${origin}/bootstrap`);
      await page.evaluate(async () => {
        await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      });
      await page.goto(`${origin}/en`);
      await page.getByLabel('Game name', { exact: true }).fill('Keep this event');
      await page.getByRole('spinbutton', { name: 'How many cards?' }).fill('4');
      await page.getByRole('button', { name: 'Make cards', exact: true }).click();
      await page.getByRole('button', { name: 'Play bingo', exact: true }).click();
      await page.getByRole('button', { name: 'Pick first number' }).click();
      await page.getByRole('button', { name: 'Pick next number' }).click();
      await expect(page.getByText('Call 2 of 90', { exact: true })).toBeVisible();
      const before = await page.evaluate(() => localStorage.getItem('bingoEventSession.v1'));
      let navigations = 0;
      page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
      legacy = false;
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await expect(page.locator('[data-offline-state="ready"]')).toBeAttached();
      expect(navigations).toBe(0);
      expect(await page.evaluate(() => localStorage.getItem('bingoEventSession.v1'))).toBe(before);
      await context.setOffline(true);
      await page.reload();
      await expect(page.getByText('Call 2 of 90', { exact: true })).toBeVisible();
      // Reload normalizes display-only card titles; preserve every gameplay field.
      expect(comparableSession((await page.evaluate(() => localStorage.getItem('bingoEventSession.v1')))!)).toEqual(comparableSession(before!));
    } finally {
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
}
