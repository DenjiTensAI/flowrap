import { test, expect } from '@playwright/test';

// Covers a blind spot of the component tests: there getBoundingClientRect
// is mocked with left/top = 0, so "forgot to subtract rect.left/top" is
// invisible under jsdom. zoom-pan.spec.ts doesn't catch it either — it
// only checks clamping, which doesn't care where the board sits.
test('zoom goes to the cursor on a board offset from the page origin', async ({ page }) => {
  await page.goto('/zoom-limits');

  const board = page.locator('.fr-viewport');
  const node = page.locator('[data-fr-node="a"]');

  const boardBox = (await board.boundingBox())!;
  expect(boardBox.y).toBeGreaterThan(0); // the board really is offset

  const before = (await node.boundingBox())!;

  const cx = boardBox.x + 300;
  const cy = boardBox.y + 200;
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, -100);

  // The exact factor from FlowBoard's contract: zoom * exp(-deltaY *
  // zoomSpeed) with zoomSpeed = 0.002 and deltaY = -100. Reading the
  // rounded readout won't do — 1.22 vs 1.2214 eats the whole tolerance.
  const k = Math.exp(0.2);

  const after = (await node.boundingBox())!;

  // The world point under the cursor stays put, so every other point
  // moves away from the cursor by exactly a factor of k.
  expect(after.x - cx).toBeCloseTo((before.x - cx) * k, 0);
  expect(after.y - cy).toBeCloseTo((before.y - cy) * k, 0);
});
