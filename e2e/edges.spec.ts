import { test, expect } from '@playwright/test';

test('the line follows the node as it is dragged', async ({ page }) => {
  await page.goto('/edges');
  const path = page.locator('path.fr-edge').first();
  const before = await path.getAttribute('d');

  const node = page.getByTestId('node-a');
  const box = (await node.boundingBox())!;
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 60, { steps: 5 });
  await page.mouse.up();

  expect(await path.getAttribute('d')).not.toBe(before);
});

test('the anchor stays on the node border at zoom != 1', async ({ page }) => {
  await page.goto('/edges');
  const board = (await page.locator('.fr-viewport').boundingBox())!;
  await page.mouse.move(board.x + board.width / 2, board.y + board.height / 2);
  for (let i = 0; i < 5; i++) await page.mouse.wheel(0, 100); // zoom out

  // On screen, the line has to start on node A's border — not in its
  // centre, and not somewhere off the node.
  const nodeBox = (await page.getByTestId('node-a').boundingBox())!;
  const start = await page
    .locator('path.fr-edge')
    .first()
    .evaluate((el: SVGPathElement) => {
      const p = el.getPointAtLength(0);
      const m = el.getScreenCTM()!;
      return { x: p.x * m.a + p.y * m.c + m.e, y: p.x * m.b + p.y * m.d + m.f };
    });

  const eps = 1.5;
  const onBorder =
    Math.abs(start.x - nodeBox.x) < eps ||
    Math.abs(start.x - (nodeBox.x + nodeBox.width)) < eps ||
    Math.abs(start.y - nodeBox.y) < eps ||
    Math.abs(start.y - (nodeBox.y + nodeBox.height)) < eps;
  expect(onBorder).toBe(true);
});

test('edges do not get in the way of panning', async ({ page }) => {
  await page.goto('/edges');
  const board = (await page.locator('.fr-viewport').boundingBox())!;
  const node = page.getByTestId('node-a');
  const before = (await node.boundingBox())!;

  // Drag right along the line between A and B: pointer-events: none has
  // to let the event through the edge and onto the board background
  await page.mouse.move(board.x + 300, board.y + 190);
  await page.mouse.down();
  await page.mouse.move(board.x + 360, board.y + 230, { steps: 5 });
  await page.mouse.up();

  const after = (await node.boundingBox())!;
  expect(after.x - before.x).toBeCloseTo(60, 0); // the whole world moved
});

test('switching the line type changes the path', async ({ page }) => {
  await page.goto('/edges');
  const path = page.locator('path.fr-edge').first();
  const bezier = await path.getAttribute('d');

  await page.getByTestId('edge-type').selectOption('straight');
  const straight = await path.getAttribute('d');
  expect(straight).not.toBe(bezier);
  expect(straight).toMatch(/^M [\d.-]+,[\d.-]+ L [\d.-]+,[\d.-]+$/);

  await page.getByTestId('edge-type').selectOption('step');
  expect((await path.getAttribute('d'))!.split(' L ')).toHaveLength(4);
});
