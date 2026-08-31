import { test, expect } from '@playwright/test';

// Component tests can't check real pointer-capture semantics: the
// PointerEvent polyfill extends MouseEvent and setPointerCapture is a
// stub. Retargeting once the cursor leaves the element is only ever
// verified here.
test('the drag keeps going once the cursor leaves the board', async ({ page }) => {
  await page.goto('/basic');
  const board = (await page.locator('.fr-viewport').boundingBox())!;
  const node = page.getByTestId('node-text');
  const before = (await node.boundingBox())!;

  const startX = before.x + 10;
  const startY = before.y + 10;
  const targetX = startX + 150;
  const targetY = board.y + board.height + 120; // BELOW the board's bottom edge

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 10 });
  await page.mouse.up();

  const after = (await node.boundingBox())!;
  expect(after.x - before.x).toBeCloseTo(targetX - startX, 0);
  expect(after.y - before.y).toBeCloseTo(targetY - startY, 0);
});

test('the node tracks the cursor 1:1 at zoom != 1 (scaleDelta)', async ({ page }) => {
  await page.goto('/zoom-limits');
  const board = (await page.locator('.fr-viewport').boundingBox())!;
  await page.mouse.move(board.x + board.width / 2, board.y + board.height / 2);
  // Zoom OUT: zooming in pushes a node at world (0,0) into negative local
  // coordinates, where overflow: hidden clips it.
  for (let i = 0; i < 30; i++) await page.mouse.wheel(0, 100);
  await expect(page.getByTestId('zoom-readout')).toHaveText('50%');

  const node = page.locator('[data-fr-node="a"]');
  const before = (await node.boundingBox())!;

  // The node must genuinely be inside the board, or mouse.down() misses
  // and the test "passes" on a zero delta.
  expect(before.x).toBeGreaterThanOrEqual(board.x);
  expect(before.y).toBeGreaterThanOrEqual(board.y);
  expect(before.x).toBeLessThan(board.x + board.width);
  expect(before.y).toBeLessThan(board.y + board.height);

  await page.mouse.move(before.x + 5, before.y + 5);
  await page.mouse.down();
  await page.mouse.move(before.x + 5 + 120, before.y + 5 + 60, { steps: 8 });
  await page.mouse.up();

  const after = (await node.boundingBox())!;
  // The world delta is divided by zoom and the render multiplies it back,
  // so on screen it's 1:1.
  expect(after.x - before.x).toBeCloseTo(120, 0);
  expect(after.y - before.y).toBeCloseTo(60, 0);
});
