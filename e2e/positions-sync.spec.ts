import { test, expect } from '@playwright/test';

test('positions survive a round trip through localStorage', async ({ page }) => {
  await page.goto('/positions-sync');

  // Select by data-fr-node: the wrapper has no id attribute, and
  // getByText('A') matches substrings case-insensitively — it would also
  // hit the Save/Load buttons and the JSON in <pre> (strict mode violation).
  const nodeA = page.locator('[data-fr-node="a"]');

  const box = await nodeA.boundingBox();
  if (!box) throw new Error('node A has no box');

  await page.mouse.move(box.x + 5, box.y + 5);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 45, { steps: 5 });
  await page.mouse.up();

  const moved = await nodeA.boundingBox();
  expect(moved!.x).toBeGreaterThan(box.x + 60);

  const jsonBefore = await page.getByTestId('positions-json').innerText();
  expect(jsonBefore).toContain('"a"');

  await page.getByTestId('save').click();
  await page.reload();

  // after the reload the node is back where it started
  const afterReload = await nodeA.boundingBox();
  expect(Math.round(afterReload!.x)).toBe(Math.round(box.x));

  await page.getByTestId('load').click();

  // The key board → node assertion: Load has to actually move the node,
  // not just redraw the JSON.
  const restored = await nodeA.boundingBox();
  expect(Math.round(restored!.x)).toBe(Math.round(moved!.x));
  expect(Math.round(restored!.y)).toBe(Math.round(moved!.y));

  const jsonAfter = await page.getByTestId('positions-json').innerText();
  expect(jsonAfter).toBe(jsonBefore);
});
