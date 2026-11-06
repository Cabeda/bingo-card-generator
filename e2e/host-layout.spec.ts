import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`host controls stay reachable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/en');
    await page.getByLabel('Event name', { exact: true }).fill('Friday night bingo');
    await page.getByRole('spinbutton', { name: 'Number of cards' }).fill('20');
    await page.getByRole('button', { name: 'Generate game →', exact: true }).click();
    await page.getByRole('button', { name: 'Host this game →' }).click();
    const draw = page.getByRole('button', { name: 'Draw first number →', exact: true });
    await expect(draw).toBeInViewport({ ratio: 1 });
    await draw.click();
    await expect(page.getByText('Call 1 of 90', { exact: true })).toBeVisible();
    for (let count = 2; count <= 6; count++) {
      await page.getByRole('button', { name: 'Draw next number →' }).click();
      await expect(page.getByText(`Call ${count} of 90`, { exact: true })).toBeVisible();
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.getByRole('button', { name: 'Draw next number →' })).toBeInViewport({ ratio: 1 });
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Draw next number →' })).toBeDisabled();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Draw next number →' })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (viewport.width < 600) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(page.getByRole('button', { name: 'Draw next number →' })).toBeInViewport({ ratio: 1 });
    }
    await page.getByRole('button', { name: 'Audience view ↗' }).click();
    await expect(page.getByRole('button', { name: 'Draw next number →' })).toHaveCount(0);
    await expect(page.locator('.bingo-c-cell')).toHaveCount(90);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const viewport of [{ width: 1280, height: 720 }, { width: 1440, height: 900 }]) {
  test(`audience can see the complete board at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/en');
    await page.getByLabel('Event name', { exact: true }).fill('Friday night bingo');
    await page.getByRole('spinbutton', { name: 'Number of cards' }).fill('4');
    await page.getByRole('button', { name: 'Generate game →', exact: true }).click();
    await page.getByRole('button', { name: 'Host this game →' }).click();
    await page.getByRole('button', { name: 'Draw first number →' }).click();
    await page.getByRole('button', { name: 'Audience view ↗' }).click();
    await expect(page.locator('.bingo-c-board')).toBeInViewport({ ratio: 1 });
    await expect(page.locator('.bingo-c-current')).toBeInViewport({ ratio: 1 });
    await expect(page.locator('.bingo-c-cell')).toHaveCount(90);
    await expect(page.getByRole('button', { name: 'Back to cards' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Draw next number →' })).toHaveCount(0);
    await expect(page.locator('.bingo-flow-nav')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Return to host' })).toBeInViewport({ ratio: 1 });
    await page.keyboard.press('Space');
    await expect(page.getByText('Call 1 of 90', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Return to host' }).click();
    await expect(page.getByRole('button', { name: 'Draw next number →' })).toBeEnabled();
  });
}
