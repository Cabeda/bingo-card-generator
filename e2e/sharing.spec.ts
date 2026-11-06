import { expect, test } from '@playwright/test';

test('shares the same deck between devices while keeping calls local', async ({ page, browser }) => {
  await page.goto('/en/cards');
  await page.getByLabel('Event name', { exact: true }).fill('Shared family evening');
  await page.getByLabel('Number of cards', { exact: true }).fill('100');
  await page.getByRole('button', { name: 'Generate game →', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your cards are ready.' })).toBeVisible();
  await page.getByRole('button', { name: 'Share game link', exact: true }).click();
  const link = await page.getByLabel('Game link', { exact: true }).inputValue();
  expect(link.length).toBeLessThan(200);
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem('bingoEventSession.v1')!).game);
  await page.getByRole('button', { name: 'Host this game →', exact: true }).click();
  await page.getByRole('button', { name: 'Draw first number →', exact: true }).click();
  await expect(page.getByText('Call 1 of 90', { exact: true })).toBeVisible();

  const device = await browser.newContext();
  try {
    const recipient = await device.newPage();
    await recipient.goto(link);
    await expect(recipient.getByRole('heading', { name: 'Your cards are ready.' })).toBeVisible();
    const received = await recipient.evaluate(() => JSON.parse(localStorage.getItem('bingoEventSession.v1')!));
    expect(received.game.cards).toEqual(original.cards);
    expect(received.drawn).toEqual([]);
    await recipient.getByRole('button', { name: 'Host this game →', exact: true }).click();
    await recipient.getByRole('button', { name: 'Draw first number →', exact: true }).click();
    await recipient.getByRole('button', { name: 'Draw next number →', exact: true }).click();
    await recipient.reload();
    await expect(recipient.getByText('Call 2 of 90', { exact: true })).toBeVisible();
    await expect(page.getByText('Call 1 of 90', { exact: true })).toBeVisible();
  } finally { await device.close(); }
});
