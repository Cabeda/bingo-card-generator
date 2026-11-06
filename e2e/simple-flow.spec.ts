import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`a first-time player can make cards and play without setup at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/en');
    await expect(page.getByLabel('Game name', { exact: true })).toHaveValue('My bingo game');
    await expect(page.getByRole('spinbutton', { name: 'How many cards?' })).toHaveValue('20');
    await page.getByRole('button', { name: 'Make cards', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your cards are ready.' })).toBeVisible();
    const help = page.getByText('Need help printing?', { exact: true }).locator('..');
    await expect(help).not.toHaveAttribute('open');
    await expect(page.getByRole('button', { name: 'Print cards', exact: true })).toBeVisible();
    if (width === 390) {
      const actions = await page.locator('.bingo-flow-print-actions').boundingBox();
      const preview = await page.locator('.bingo-flow-paper-preview').boundingBox();
      expect(actions!.y).toBeLessThan(preview!.y);
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Play bingo', exact: true }).click();
    await page.getByRole('button', { name: 'Pick first number', exact: true }).click();
    await expect(page.getByText('Call 1 of 90', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pick next number', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pick next number', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pick next number', exact: true })).toBeEnabled();
  });
}

for (const locale of ['en', 'pt', 'es', 'fr']) {
  test(`the ${locale} flow fits a small phone with readable controls`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto(`/${locale}`);
    await page.locator('.bingo-flow-setup form .bingo-primary').click();
    await expect(page.locator('.bingo-flow-print-actions')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator('.bingo-flow-print-actions > .bingo-primary').last().click();
    const next = page.locator('.bingo-c-actions .bingo-primary');
    await expect(next).toBeVisible();
    expect(await next.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await next.click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('bingoEventSession.v1')!).drawn.length)).toBe(1);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
