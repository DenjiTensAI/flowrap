import { test, expect, devices } from '@playwright/test';

/**
 * The whole drag is built on pointer events, which gets touch for free —
 * and "for free" is exactly the claim worth testing on real touch input:
 * `touch-action: none` on the port is mandatory or the browser eats the
 * gesture as a scroll, and pointer capture behaves differently there.
 *
 * Events go through CDP `Input.dispatchTouchEvent` rather than
 * dispatchEvent from inside the page: a synthetic PointerEvent has no
 * live pointer behind it, `setPointerCapture` throws, and the test would
 * be measuring the wrong thing.
 */
test.use({ ...devices['Pixel 7'] });

async function touchDrag(
  page: import('@playwright/test').Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps: number
) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: from.x, y: from.y }]
  });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: from.x + ((to.x - from.x) * i) / steps,
          y: from.y + ((to.y - from.y) * i) / steps
        }
      ]
    });
  }
  return {
    end: () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  };
}

const center = (b: { x: number; y: number; width: number; height: number }) => ({
  x: b.x + b.width / 2,
  y: b.y + b.height / 2
});

test('touch: dragging with a finger creates a link', async ({ page }) => {
  await page.goto('/connectors');
  const from = center(
    (await page.locator('[data-fr-node="a"] [data-fr-handle="out"]').boundingBox())!
  );
  const to = center(
    (await page.locator('[data-fr-node="b"] [data-fr-handle="in"]').boundingBox())!
  );

  const drag = await touchDrag(page, from, to, 8);
  // Touch has no hover and no Escape, so the preview line is the only
  // feedback during the gesture — it had better be visible.
  await expect(page.locator('path.fr-connection')).toHaveCount(1);
  await drag.end();

  const links = JSON.parse(await page.getByTestId('links-json').innerText());
  expect(links).toHaveLength(1);
  expect(links[0]).toMatchObject({ from: 'a', to: 'b', fromHandle: 'out', toHandle: 'in' });
  await expect(page.locator('path.fr-connection')).toHaveCount(0);
});

test('touch: the node does NOT move when you drag its port', async ({ page }) => {
  await page.goto('/connectors');
  const before = (await page.getByTestId('node-a').boundingBox())!;
  const from = center(
    (await page.locator('[data-fr-node="a"] [data-fr-handle="out"]').boundingBox())!
  );

  const drag = await touchDrag(page, from, { x: from.x + 90, y: from.y + 70 }, 6);
  await drag.end();

  const after = (await page.getByTestId('node-a').boundingBox())!;
  expect(after.x).toBeCloseTo(before.x, 0);
  expect(after.y).toBeCloseTo(before.y, 0);
});
