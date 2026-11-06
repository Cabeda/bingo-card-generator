import { expect, type Page, test } from '@playwright/test';

async function state(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('bingoEventSession.v1')!));
}
async function records(page: Page) {
  return page.evaluate(() => new Promise<any[]>((resolve, reject) => {
    const request = indexedDB.open('bingoGameLibrary.v1', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('games');
      const rows = tx.objectStore('games').getAll();
      tx.oncomplete = () => { db.close(); resolve(rows.result.filter(row => !row.deleted)); };
    };
  }));
}
async function library(page: Page) {
  const settings = page.locator('.bingo-header-settings');
  await settings.locator('summary').click();
  await settings.getByRole('button', { name: 'Saved games', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Saved on this device' })).toBeVisible();
}

test('multiple local games retain calls and all print settings across an offline refresh', async ({ page, context }) => {
  await page.goto('/en');
  await page.getByLabel('Game name', { exact: true }).fill('Community');
  await page.getByRole('spinbutton', { name: 'How many cards?' }).fill('4');
  await page.getByRole('button', { name: 'Make cards', exact: true }).click();
  await page.locator('.bingo-print-preferences > summary').click();
  const preferences = page.locator('.bingo-print-preferences');
  await preferences.locator('input[type=checkbox]').nth(0).check();
  await preferences.locator('input[type=checkbox]').nth(1).check();
  await preferences.locator('select').first().selectOption('square');
  await preferences.locator('input[type=text]').fill('Community evening');
  await preferences.locator('input[type=file]').first().setInputFiles({
    name: 'logo.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQ0AAAAASUVORK5CYII=', 'base64'),
  });
  await expect.poll(async () => (await state(page)).printOptions.logo).toMatch(/^data:image\/png/);
  await page.getByRole('button', { name: 'Play bingo', exact: true }).click();
  await page.getByRole('button', { name: 'Pick first number' }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const first = await state(page);
  await expect.poll(async () => (await records(page))[0]?.session.paused).toBe(true);
  await page.getByRole('button', { name: 'Back to cards' }).click();
  await page.getByRole('button', { name: 'Edit game' }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Make cards', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your cards are ready.' })).toBeVisible();
  await expect.poll(async () => (await records(page)).length).toBe(2);
  const second = await state(page);
  expect(second.libraryId).not.toBe(first.libraryId);
  await library(page);
  await expect(page.getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Resume game' }).click();
  await expect(page.getByText('Call 1 of 90', { exact: true })).toBeVisible();
  expect((await state(page)).game.cards.map(({ cardNumber, numbers }: { cardNumber: number; numbers: number[] }) => ({ cardNumber, numbers }))).toEqual(first.game.cards.map(({ cardNumber, numbers }: { cardNumber: number; numbers: number[] }) => ({ cardNumber, numbers })));
  expect((await state(page)).printOptions).toEqual(first.printOptions);
  await expect(page.locator('[data-offline-state]')).toHaveAttribute('data-offline-state', 'ready');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to cards' }).click();
  await expect(page.locator('.bingo-flow-sheet-frame footer')).toHaveText(Array(4).fill('Community evening'));
  await expect(page.locator('.bingo-flow-sheet-frame header img')).toHaveCount(4);
  await library(page);
  await expect(page.getByRole('listitem')).toHaveCount(2);
  // Remove the active copy while preserving its deck and calls in the current session.
  const current = page.getByRole('listitem').filter({ hasText: 'Current game' });
  page.once('dialog', dialog => dialog.accept());
  await current.getByRole('button', { name: 'Remove saved copy' }).click();
  await expect.poll(async () => (await records(page)).length).toBe(1);
  await page.reload();
  await library(page);
  await expect(page.getByRole('listitem')).toHaveCount(1);
  expect((await state(page)).libraryId).toBeNull();
  expect((await state(page)).drawn).toEqual(first.drawn);
  await page.getByRole('button', { name: 'Save this game again' }).click();
  await expect.poll(async () => (await records(page)).length).toBe(2);
});

test('a second tab cannot recreate a saved copy removed in the first tab', async ({ page, context }) => {
  await page.goto('/en');
  await page.getByLabel('Game name', { exact: true }).fill('Two tabs');
  await page.getByRole('spinbutton', { name: 'How many cards?' }).fill('2');
  await page.getByRole('button', { name: 'Make cards', exact: true }).click();
  await expect.poll(async () => (await records(page)).length).toBe(1);
  const other = await context.newPage();
  await other.goto('/en');
  await expect(other.getByRole('heading', { name: 'Your cards are ready.' })).toBeVisible();
  await library(page);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Remove saved copy' }).click();
  await expect.poll(async () => (await records(page)).length).toBe(0);
  await other.getByRole('button', { name: 'Play bingo', exact: true }).click();
  await other.getByRole('button', { name: 'Pick first number' }).click();
  await expect(other.getByText('Call 1 of 90', { exact: true })).toBeVisible();
  await expect(other.locator('.bingo-error[role=alert]')).toBeVisible();
  expect(await records(other)).toEqual([]);
});
