import { type BrowserContext, chromium, expect, firefox, type Page, test } from '@playwright/test';

type SavedSession = {
  game: { cards: { cardNumber: number; numbers: (number | null)[] }[] };
  drawn: number[];
  paused: boolean;
  target: string;
  cardsPerPage: number;
};

const origin = 'http://127.0.0.1:3100';

async function saved(page: Page) {
  return page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('bingoEventSession.v1') || 'null');
    if (!state?.game) return null;
    return {
      cards: state.game.cards.map((card: SavedSession['game']['cards'][number]) => ({
        cardNumber: card.cardNumber, numbers: card.numbers,
      })),
      drawn: state.drawn,
      paused: state.paused,
      target: state.target,
      cardsPerPage: state.cardsPerPage,
    };
  });
}

async function prepare(page: Page) {
  await page.goto(`${origin}/en`);
  await page.getByLabel('Game name', { exact: true }).fill('Offline community bingo');
  await page.getByRole('spinbutton', { name: 'How many cards?' }).fill('4');
  await page.getByRole('button', { name: 'Make cards', exact: true }).click();
  await page.getByRole('radio', { name: '2', exact: true }).locator('..').click();
  await page.getByRole('button', { name: 'Play bingo', exact: true }).click();
  for (let count = 1; count <= 3; count++) {
    await draw(page, count);
  }
  await page.getByRole('combobox', { name: /Playing for/ }).selectOption('full');
  await expect.poll(async () => (await saved(page))?.target).toBe('full');
  await expect(page.locator('[data-offline-state]')).toHaveAttribute('data-offline-state', 'ready');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    }
  });
  await expect(page.locator('[data-offline-state="ready"]')).toBeAttached();
  await expect(page.locator('[data-offline-state="ready"]')).toBeHidden();
}

async function draw(page: Page, total: number) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Space');
  await expect.poll(async () => (await saved(page))?.drawn.length).toBe(total);
  await expect(page.getByText(`Call ${total} of 90`, { exact: true })).toBeVisible();
}

async function persistent(profile: string, offline = false, browserName = 'chromium'): Promise<BrowserContext> {
  const engine = browserName === 'firefox' ? firefox : chromium;
  const context = await engine.launchPersistentContext(profile, { headless: true, offline, viewport: { width: 1440, height: 1000 } });
  context.setDefaultTimeout(15_000);
  return context;
}

test('first visit supports offline calls, refresh, tab replacement and browser restart', async ({}, testInfo) => {
  const profile = testInfo.outputPath('profile');
  let context = await persistent(profile, false, testInfo.project.name);
  try {
    let page = await context.newPage();
    await prepare(page);
    await context.setOffline(true);
    const taggedAsset = await page.evaluate(async () => {
      const script = document.querySelector<HTMLScriptElement>('script[src*="/_next/static/"]')!;
      const url = new URL(script.src);
      url.searchParams.set('dpl', 'deployment-query-regression');
      const response = await fetch(url);
      return { ok: response.ok, type: response.headers.get('content-type') };
    });
    expect(taggedAsset.ok).toBe(true);
    expect(taggedAsset.type).toMatch(/javascript/);
    await draw(page, 4);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect.poll(async () => (await saved(page))?.paused).toBe(true);
    const expected = await saved(page);
    expect(expected?.cards).toHaveLength(4);
    expect(expected?.cardsPerPage).toBe(2);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    await expect.poll(() => saved(page)).toEqual(expected);
    await expect(page.getByRole('combobox', { name: /Playing for/ })).toHaveValue('full');
    await page.close();
    page = await context.newPage();
    await page.goto(`${origin}/en`);
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    await expect.poll(() => saved(page)).toEqual(expected);
    await context.close();
    context = await persistent(profile, true, testInfo.project.name);
    page = await context.newPage();
    await page.goto(`${origin}/en`);
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    await expect.poll(() => saved(page)).toEqual(expected);
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await draw(page, 5);
  } finally {
    await context.close();
  }
});

test('root and every unvisited locale route open offline with the saved deck and calls', async ({}, testInfo) => {
  const context = await persistent(testInfo.outputPath('profile'), false, testInfo.project.name);
  try {
    const page = await context.newPage();
    await prepare(page);
    const expected = await saved(page);
    await context.setOffline(true);
    for (const path of ['/', ...['en', 'pt', 'es', 'fr'].flatMap((locale) => [`/${locale}`, `/${locale}/cards`, `/${locale}/game`])]) {
      await page.goto(`${origin}${path}`);
      await expect(page.locator('.bingo-workspace')).toBeVisible();
      await expect.poll(() => saved(page)).toEqual(expected);
    }
    await page.goto(`${origin}/fr/cards`);
    await page.locator('.bingo-header-settings > summary').click();
    await page.getByLabel('Select language').selectOption('en');
    await expect(page).toHaveURL(/\/en\/cards$/);
    await expect.poll(() => saved(page)).toEqual(expected);
  } finally {
    await context.close();
  }
});

test('evicted caches lose readiness offline and are repaired after reconnecting', async ({}, testInfo) => {
  const context = await persistent(testInfo.outputPath('profile'), false, testInfo.project.name);
  try {
    const page = await context.newPage();
    await prepare(page);
    const expected = await saved(page);
    await context.setOffline(true);
    await page.evaluate(async () => {
      await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('[data-offline-state="unavailable"]')).toBeVisible();
    await expect(page.locator('[data-offline-state="ready"]')).toHaveCount(0);
    let navigations = 0;
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
    await context.setOffline(false);
    await expect(page.locator('[data-offline-state="ready"]')).toBeAttached();
    await expect(page.locator('[data-offline-state="ready"]')).toBeHidden();
    expect(navigations).toBe(0);
    await expect.poll(() => saved(page)).toEqual(expected);
    await context.setOffline(true);
    // A complete but unrelated cache must not mask loss of the active precache.
    await page.evaluate(async () => {
      const channel = new MessageChannel();
      const info = await new Promise<{ cacheName: string }>(resolve => {
        channel.port1.onmessage = event => resolve(event.data);
        navigator.serviceWorker.controller!.postMessage({ type: 'OFFLINE_CACHE_INFO' }, [channel.port2]);
      });
      channel.port1.close();
      channel.port2.close();
      const active = await caches.open(info.cacheName);
      const unrelated = await caches.open('unrelated-cache');
      for (const request of await active.keys()) {
        await unrelated.put(request, (await active.match(request))!);
      }
      await caches.delete(info.cacheName);
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('[data-offline-state="unavailable"]')).toBeVisible();
    await context.setOffline(false);
    await expect(page.locator('[data-offline-state="ready"]')).toBeAttached();
    await expect(page.locator('[data-offline-state="ready"]')).toBeHidden();
    expect(navigations).toBe(0);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.bingo-workspace')).toBeVisible();
    await expect.poll(() => saved(page)).toEqual(expected);
  } finally {
    await context.close();
  }
});
