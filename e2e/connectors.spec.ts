import { test, expect } from '@playwright/test';

test('dragging port to port creates a link', async ({ page }) => {
  await page.goto('/connectors');
  const from = (await page.locator('[data-fr-node="a"] [data-fr-handle="out"]').boundingBox())!;
  const to = (await page.locator('[data-fr-node="b"] [data-fr-handle="in"]').boundingBox())!;

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();

  const links = JSON.parse(await page.getByTestId('links-json').innerText());
  expect(links).toHaveLength(1);
  expect(links[0]).toMatchObject({ from: 'a', to: 'b', fromHandle: 'out', toHandle: 'in' });
  await expect(page.locator('path.fr-edge')).toHaveCount(1);
});

test('the node does NOT move when you drag its port', async ({ page }) => {
  // regression: without stopPropagation the node's drag steals the capture
  await page.goto('/connectors');
  const before = (await page.getByTestId('node-a').boundingBox())!;
  const from = (await page.locator('[data-fr-node="a"] [data-fr-handle="out"]').boundingBox())!;

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 120, from.y + 90, { steps: 6 });
  await page.mouse.up();

  const after = (await page.getByTestId('node-a').boundingBox())!;
  expect(after.x).toBeCloseTo(before.x, 0);
  expect(after.y).toBeCloseTo(before.y, 0);
});

test('the board does NOT pan during a drag', async ({ page }) => {
  await page.goto('/connectors');
  const before = (await page.getByTestId('node-b').boundingBox())!;
  const from = (await page.locator('[data-fr-node="a"] [data-fr-handle="out"]').boundingBox())!;
  const vp = (await page.locator('.fr-viewport').boundingBox())!;

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(vp.x + vp.width - 40, vp.y + vp.height - 40, { steps: 8 });
  await page.mouse.up();

  const after = (await page.getByTestId('node-b').boundingBox())!;
  expect(after.x).toBeCloseTo(before.x, 0);
});

test('the preview line shows during the drag and goes away after', async ({ page }) => {
  await page.goto('/connectors');
  const from = (await page.locator('[data-fr-node="a"] [data-fr-handle="out"]').boundingBox())!;

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 150, from.y + 100, { steps: 5 });
  await expect(page.locator('path.fr-connection')).toHaveCount(1);

  await page.mouse.up();
  await expect(page.locator('path.fr-connection')).toHaveCount(0);
});

test('a drop on empty space creates nothing', async ({ page }) => {
  await page.goto('/connectors');
  const from = (await page.locator('[data-fr-node="a"] [data-fr-handle="out"]').boundingBox())!;
  const vp = (await page.locator('.fr-viewport').boundingBox())!;

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(vp.x + vp.width - 30, vp.y + 30, { steps: 5 });
  await page.mouse.up();

  expect(JSON.parse(await page.getByTestId('links-json').innerText())).toHaveLength(0);
});

test('Escape cancels the drag', async ({ page }) => {
  await page.goto('/connectors');
  const from = (await page.locator('[data-fr-node="a"] [data-fr-handle="out"]').boundingBox())!;
  const to = (await page.locator('[data-fr-node="b"] [data-fr-handle="in"]').boundingBox())!;

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 5 });
  await page.keyboard.press('Escape');
  await expect(page.locator('path.fr-connection')).toHaveCount(0);
  await page.mouse.up();

  expect(JSON.parse(await page.getByTestId('links-json').innerText())).toHaveLength(0);
});

test('isValidConnection rejects the link', async ({ page }) => {
  await page.goto('/connectors');
  await page.getByTestId('reject').check();

  const from = (await page.locator('[data-fr-node="a"] [data-fr-handle="out"]').boundingBox())!;
  const to = (await page.locator('[data-fr-node="b"] [data-fr-handle="in"]').boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 5 });
  await page.mouse.up();

  expect(JSON.parse(await page.getByTestId('links-json').innerText())).toHaveLength(0);
});

test('dragging works at zoom != 1', async ({ page }) => {
  // the one test the whole world-units geometry exists for
  await page.goto('/connectors');
  const vp = (await page.locator('.fr-viewport').boundingBox())!;
  await page.mouse.move(vp.x + vp.width / 2, vp.y + vp.height / 2);
  for (let i = 0; i < 4; i++) await page.mouse.wheel(0, 100);   // zoom out

  const from = (await page.locator('[data-fr-node="a"] [data-fr-handle="out"]').boundingBox())!;
  const to = (await page.locator('[data-fr-node="b"] [data-fr-handle="in"]').boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();

  expect(JSON.parse(await page.getByTestId('links-json').innerText())).toHaveLength(1);
});

test('the edge anchor lands on the port, not on the node centre', async ({ page }) => {
  await page.goto('/connectors');
  const from = (await page.locator('[data-fr-node="a"] [data-fr-handle="out"]').boundingBox())!;
  const to = (await page.locator('[data-fr-node="b"] [data-fr-handle="in"]').boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 6 });
  await page.mouse.up();

  const start = await page.locator('path.fr-edge').first().evaluate((el: SVGPathElement) => {
    const p = el.getPointAtLength(0);
    const m = el.getScreenCTM()!;
    return { x: p.x * m.a + p.y * m.c + m.e, y: p.x * m.b + p.y * m.d + m.f };
  });

  expect(start.x).toBeCloseTo(from.x + from.width / 2, 0);
  expect(start.y).toBeCloseTo(from.y + from.height / 2, 0);
});

test('a drop on the node BODY lands on its port, not on the border', async ({ page }) => {
  await page.goto('/connectors');
  const from = (await page.locator('[data-fr-node="a"] [data-fr-handle="out"]').boundingBox())!;
  const card = (await page.getByTestId('node-b').boundingBox())!;
  const port = (await page.locator('[data-fr-node="b"] [data-fr-handle="in"]').boundingBox())!;

  const endOf = (sel: string) =>
    page.locator(sel).first().evaluate((el: SVGPathElement) => {
      const p = el.getPointAtLength(el.getTotalLength());
      const m = el.getScreenCTM()!;
      return { x: p.x * m.a + p.y * m.c + m.e, y: p.x * m.b + p.y * m.d + m.f };
    });

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // right edge of the card: as far as possible from its only port
  await page.mouse.move(card.x + card.width - 6, card.y + card.height / 2, { steps: 6 });

  // the preview line must show the port BEFORE the button is released
  const preview = await endOf('path.fr-connection');
  expect(preview.x).toBeCloseTo(port.x + port.width / 2, 0);
  expect(preview.y).toBeCloseTo(port.y + port.height / 2, 0);

  await page.mouse.up();

  const links = JSON.parse(await page.getByTestId('links-json').innerText());
  expect(links).toHaveLength(1);
  expect(links[0]).toMatchObject({ from: 'a', to: 'b', fromHandle: 'out', toHandle: 'in' });

  const end = await endOf('path.fr-edge');
  expect(end.x).toBeCloseTo(port.x + port.width / 2, 0);
  expect(end.y).toBeCloseTo(port.y + port.height / 2, 0);
});

test('a drop on an INCOMPATIBLE port falls back to a compatible one', async ({ page }) => {
  // regression: hitting a port that points the wrong way rejected the
  // whole drop, while a drop on the same card's body went through
  await page.goto('/connectors');
  const from = (await page.locator('[data-fr-node="a"] [data-fr-handle="out"]').boundingBox())!;
  const wrong = (await page.locator('[data-fr-node="c"] [data-fr-handle="out"]').boundingBox())!;

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(wrong.x + wrong.width / 2, wrong.y + wrong.height / 2, { steps: 6 });
  await page.mouse.up();

  const links = JSON.parse(await page.getByTestId('links-json').innerText());
  expect(links).toHaveLength(1);
  expect(links[0]).toMatchObject({ from: 'a', to: 'c', fromHandle: 'out', toHandle: 'in' });
});
