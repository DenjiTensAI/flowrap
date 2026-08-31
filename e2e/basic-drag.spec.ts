import { test, expect } from '@playwright/test';

test('a node moves when dragged with the mouse', async ({ page }) => {
  await page.goto('/basic');
  const node = page.getByTestId('node-text');
  const box = await node.boundingBox();
  if (!box) throw new Error('node not found');

  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 40, { steps: 5 });
  await page.mouse.up();

  const newBox = await node.boundingBox();
  expect(newBox!.x).toBeGreaterThan(box.x + 40);
  expect(newBox!.y).toBeGreaterThan(box.y + 20);
});
