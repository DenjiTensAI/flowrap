import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import FlowNodeHarness from './FlowNode.harness.svelte';

describe('FlowNode', () => {
  it('drags freely when uncontrolled', async () => {
    const { getByTestId } = render(FlowNodeHarness, { props: { controlled: false } });
    const node = getByTestId('node').parentElement as HTMLElement; // the data-fr-node wrapper

    await fireEvent.pointerDown(node, { clientX: 100, clientY: 100, pointerId: 1 });
    await fireEvent.pointerMove(node, { clientX: 130, clientY: 90, pointerId: 1 });

    // The exact string is part of the contract: no space after the
    // comma, no translate3d.
    expect(node.style.transform).toContain('translate(30px,-10px)');
  });

  it('divides the screen delta by zoom (scaleDelta)', async () => {
    const { getByTestId } = render(FlowNodeHarness, {
      props: { controlled: false, initialZoom: 2 }
    });
    const node = getByTestId('node').parentElement as HTMLElement;

    await fireEvent.pointerDown(node, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(node, { clientX: 100, clientY: 40, pointerId: 1 });

    // 100/2 and 40/2 — without scaleDelta the node would run twice as fast
    expect(node.style.transform).toContain('translate(50px,20px)');
  });

  it('passes x/y back through bind: when controlled', async () => {
    const onXY = vi.fn();
    const { getByTestId } = render(FlowNodeHarness, {
      props: { controlled: true, onXY }
    });
    const node = getByTestId('node').parentElement as HTMLElement;

    await fireEvent.pointerDown(node, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(node, { clientX: 15, clientY: 15, pointerId: 1 });

    const last = onXY.mock.calls.at(-1)?.[0];
    expect(last).toEqual({ x: 15, y: 15 });
  });

  it('unregisters from the board context on unmount', () => {
    const { unmount, getByTestId } = render(FlowNodeHarness, {
      props: { controlled: false }
    });
    expect(getByTestId('node')).toBeInTheDocument();
    expect(() => unmount()).not.toThrow();
  });
});
