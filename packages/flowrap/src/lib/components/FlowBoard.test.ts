import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import FlowBoardHarness from './FlowBoard.harness.svelte';
import FlowBoardPositionsHarness from './FlowBoard.positions.harness.svelte';

function stubRect(el: HTMLElement) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    toJSON() {}
  });
}

describe('FlowBoard', () => {
  it('zooms toward the cursor on wheel', async () => {
    const onState = vi.fn();
    const { container } = render(FlowBoardHarness, { props: { onState } });
    const viewport = container.querySelector('.fr-viewport') as HTMLElement;
    stubRect(viewport);

    await fireEvent.wheel(viewport, { deltaY: -100, clientX: 150, clientY: 80 });

    const last = onState.mock.calls.at(-1)?.[0];
    expect(last.zoom).toBeGreaterThan(1);
  });

  it('clamps zoom to maxZoom', async () => {
    const onState = vi.fn();
    const { container } = render(FlowBoardHarness, { props: { onState } });
    const viewport = container.querySelector('.fr-viewport') as HTMLElement;
    stubRect(viewport);

    for (let i = 0; i < 50; i++) {
      await fireEvent.wheel(viewport, { deltaY: -100, clientX: 100, clientY: 100 });
    }

    const last = onState.mock.calls.at(-1)?.[0];
    // toBe on purpose: toBeLessThanOrEqual would pass on a broken clamp
    expect(last.zoom).toBe(4); // default maxZoom
  });

  it('clamps zoom to minZoom', async () => {
    const onState = vi.fn();
    const { container } = render(FlowBoardHarness, { props: { onState } });
    const viewport = container.querySelector('.fr-viewport') as HTMLElement;
    stubRect(viewport);

    for (let i = 0; i < 50; i++) {
      await fireEvent.wheel(viewport, { deltaY: 100, clientX: 100, clientY: 100 });
    }

    const last = onState.mock.calls.at(-1)?.[0];
    expect(last.zoom).toBe(0.1); // default minZoom
  });

  it('pans when the background is dragged', async () => {
    const onState = vi.fn();
    const { container } = render(FlowBoardHarness, { props: { onState } });
    const viewport = container.querySelector('.fr-viewport') as HTMLElement;
    stubRect(viewport);

    await fireEvent.pointerDown(viewport, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(viewport, { clientX: 40, clientY: 25, pointerId: 1 });
    await fireEvent.pointerUp(viewport, { clientX: 40, clientY: 25, pointerId: 1 });

    const last = onState.mock.calls.at(-1)?.[0];
    expect(last.pan).toEqual({ x: 40, y: 25 });
  });

  it('does NOT pan when the drag started on a node', async () => {
    const onState = vi.fn();
    const { container, getByTestId } = render(FlowBoardHarness, { props: { onState } });
    const viewport = container.querySelector('.fr-viewport') as HTMLElement;
    stubRect(viewport);

    // fireEvent dispatches with bubbles: true, so the event reaches
    // .fr-viewport — without params.filter the board would start panning.
    const node = getByTestId('hnode').parentElement as HTMLElement;
    await fireEvent.pointerDown(node, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(node, { clientX: 40, clientY: 25, pointerId: 1 });
    await fireEvent.pointerUp(node, { clientX: 40, clientY: 25, pointerId: 1 });

    const last = onState.mock.calls.at(-1)?.[0];
    expect(last.pan).toEqual({ x: 0, y: 0 });
  });
});

describe('FlowBoard: two-way bind:positions', () => {
  it('dragging a node surfaces in positions (node → board)', async () => {
    const onPositions = vi.fn();
    const { getByTestId } = render(FlowBoardPositionsHarness, {
      props: { onPositions }
    });
    const node = getByTestId('node-a').parentElement as HTMLElement;

    await fireEvent.pointerDown(node, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(node, { clientX: 12, clientY: 34, pointerId: 1 });
    await fireEvent.pointerUp(node, { clientX: 12, clientY: 34, pointerId: 1 });

    const last = onPositions.mock.calls.at(-1)?.[0];
    expect(last).toEqual({ a: { x: 12, y: 34 } });
  });

  it('assigning positions from outside moves the node (board → node)', async () => {
    const { getByTestId } = render(FlowBoardPositionsHarness);
    const node = getByTestId('node-a').parentElement as HTMLElement;

    await fireEvent.click(getByTestId('apply'));

    expect(node.style.transform).toContain('translate(77px,88px)');
  });
});
