import { test, expect } from '@playwright/test';

test('the Reset button puts a controlled node back where it started', async ({ page }) => {
  await page.goto('/controlled');
  const node = page.getByTestId('node');
  const initial = await node.boundingBox();

  const box = await node.boundingBox();
  await page.mouse.move(box!.x + 10, box!.y + 10);
  await page.mouse.down();
  await page.mouse.move(box!.x + 100, box!.y + 100, { steps: 5 });
  await page.mouse.up();

  await expect(page.getByTestId('readout')).not.toHaveText('x: 0, y: 0');

  await page.getByTestId('reset').click();
  const afterReset = await node.boundingBox();

  expect(Math.round(afterReset!.x)).toBe(Math.round(initial!.x));
  expect(Math.round(afterReset!.y)).toBe(Math.round(initial!.y));
});
