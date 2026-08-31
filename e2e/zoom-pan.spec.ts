import { test, expect } from '@playwright/test';

test('zoom is clamped to the given range', async ({ page }) => {
  await page.goto('/zoom-limits');
  const readout = page.getByTestId('zoom-readout');

  // MANDATORY: page.mouse.wheel fires at the current cursor position,
  // which starts at (0,0) — that's <p data-testid="zoom-readout">, not the
  // board, and the wheel event would never reach .fr-viewport.
  const board = page.locator('.fr-viewport');
  const box = await board.boundingBox();
  if (!box) throw new Error('board has no box — check the height of .board-host');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, -100);
  }
  await expect(readout).toHaveText('150%');

  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 100);
  }
  await expect(readout).toHaveText('50%');
});

test('dragging the background pans the board, dragging a node does not', async ({ page }) => {
  await page.goto('/basic');
  const board = (await page.locator('.fr-viewport').boundingBox())!;
  const node = page.getByTestId('node-text');

  // 1. Dragging EMPTY background moves the node along with the world.
  //    Pan in the POSITIVE direction: going negative pushes nodes at world
  //    (40,40) past the left edge, where overflow: hidden clips them and
  //    mouse.down() on their boundingBox() misses.
  const beforePan = (await node.boundingBox())!;
  const emptyX = board.x + 500; // right of every node, so definitely background
  const emptyY = board.y + 200;

  await page.mouse.move(emptyX, emptyY);
  await page.mouse.down();
  await page.mouse.move(emptyX + 70, emptyY + 45, { steps: 5 });
  await page.mouse.up();

  const afterPan = (await node.boundingBox())!;
  expect(afterPan.x - beforePan.x).toBeCloseTo(70, 0);
  expect(afterPan.y - beforePan.y).toBeCloseTo(45, 0);

  // 2. Dragging a NODE moves only that node: its neighbour stays put, so
  //    no pan started (params.filter did its job).
  const other = page.getByTestId('node-image');
  const otherBefore = (await other.boundingBox())!;
  const dragged = (await node.boundingBox())!;

  await page.mouse.move(dragged.x + 10, dragged.y + 10);
  await page.mouse.down();
  await page.mouse.move(dragged.x + 10 + 50, dragged.y + 10 + 30, { steps: 5 });
  await page.mouse.up();

  const otherAfter = (await other.boundingBox())!;
  expect(otherAfter.x).toBeCloseTo(otherBefore.x, 0);
  expect(otherAfter.y).toBeCloseTo(otherBefore.y, 0);

  const nodeAfter = (await node.boundingBox())!;
  expect(nodeAfter.x - dragged.x).toBeCloseTo(50, 0);
  expect(nodeAfter.y - dragged.y).toBeCloseTo(30, 0);
});
