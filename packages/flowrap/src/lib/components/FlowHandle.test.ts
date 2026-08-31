import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Harness from './FlowHandle.harness.svelte';

describe('FlowHandle', () => {
  it('renders a dot carrying data-fr-handle', () => {
    const { container } = render(Harness);
    expect(container.querySelector('[data-fr-handle="out"]')).toBeInTheDocument();
  });

  it('throws a readable error outside FlowNode', () => {
    expect(() => render(Harness, { props: { orphanHandle: true } }))
      .toThrow(/<FlowHandle> must be rendered inside <FlowNode>/);
  });

  it('pointerdown on a port does NOT move the node', async () => {
    // regression: without stopPropagation the node slides out from under
    // the cursor
    const { container, getByTestId } = render(Harness);
    const node = container.querySelector('[data-fr-node="a"]') as HTMLElement;
    const before = node.style.transform;

    const handle = getByTestId('handle-out');
    await fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientX: 80, clientY: 60, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientX: 80, clientY: 60, pointerId: 1 });

    expect(node.style.transform).toBe(before);
  });

  it('draws a preview line while dragging', async () => {
    const { container, getByTestId } = render(Harness);
    expect(container.querySelector('path.fr-connection')).toBeNull();

    const handle = getByTestId('handle-out');
    await fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientX: 80, clientY: 60, pointerId: 1 });

    expect(container.querySelector('path.fr-connection')).toBeInTheDocument();
  });

  it('the preview disappears after the drop', async () => {
    const { container, getByTestId } = render(Harness);
    const handle = getByTestId('handle-out');
    await fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientX: 80, clientY: 60, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientX: 80, clientY: 60, pointerId: 1 });

    expect(container.querySelector('path.fr-connection')).toBeNull();
  });

  it('onconnect fires with from/to/handles on a valid drop', async () => {
    const onconnect = vi.fn();
    const { getByTestId } = render(Harness, { props: { onconnect, dropTarget: { node: 'b', handle: 'in' } } });

    const handle = getByTestId('handle-out');
    await fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientX: 80, clientY: 60, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientX: 80, clientY: 60, pointerId: 1 });

    expect(onconnect).toHaveBeenCalledWith({
      from: 'a', to: 'b', fromHandle: 'out', toHandle: 'in'
    });
  });

  it('a drop on the node BODY lands on its port, not on the border', async () => {
    // regression: before snapping, the link arrived at some arbitrary
    // point on the border with a perfectly good port right there
    const onconnect = vi.fn();
    const { getByTestId } = render(Harness, {
      props: { onconnect, dropTarget: { node: 'b' } }
    });

    const handle = getByTestId('handle-out');
    await fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientX: 80, clientY: 60, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientX: 80, clientY: 60, pointerId: 1 });

    expect(onconnect).toHaveBeenCalledWith({
      from: 'a',
      to: 'b',
      fromHandle: 'out',
      toHandle: 'in'
    });
  });

  it('a drop on an INCOMPATIBLE port falls back to a compatible one', async () => {
    // regression: hitting a port that points the wrong way rejected the
    // whole drop, while two pixels to the left, on the card body, it went
    // through — a cliff edge that reads as a bug
    const onconnect = vi.fn();
    const { getByTestId } = render(Harness, {
      props: { onconnect, dropTarget: { node: 'b', handle: 'out' } }
    });

    const handle = getByTestId('handle-out');
    await fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientX: 80, clientY: 60, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientX: 80, clientY: 60, pointerId: 1 });

    expect(onconnect).toHaveBeenCalledWith({
      from: 'a',
      to: 'b',
      fromHandle: 'out',
      toHandle: 'in'
    });
  });

  it('a drop on a node with NO ports leaves toHandle empty', async () => {
    // anchoring on the node border is the no-port behaviour, and it stays
    const onconnect = vi.fn();
    const { getByTestId } = render(Harness, {
      props: { onconnect, dropTarget: { node: 'c' } }
    });

    const handle = getByTestId('handle-out');
    await fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientX: 80, clientY: 60, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientX: 80, clientY: 60, pointerId: 1 });

    expect(onconnect).toHaveBeenCalledWith({
      from: 'a',
      to: 'c',
      fromHandle: 'out',
      toHandle: undefined
    });
  });

  it('a drop on empty space skips onconnect and clears the preview', async () => {
    const onconnect = vi.fn();
    const { container, getByTestId } = render(Harness, { props: { onconnect, dropTarget: null } });

    const handle = getByTestId('handle-out');
    await fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientX: 500, clientY: 500, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientX: 500, clientY: 500, pointerId: 1 });

    expect(onconnect).not.toHaveBeenCalled();
    expect(container.querySelector('path.fr-connection')).toBeNull();
  });

  it('a self-connect is rejected', async () => {
    const onconnect = vi.fn();
    const { getByTestId } = render(Harness, { props: { onconnect, dropTarget: { node: 'a', handle: 'in' } } });

    const handle = getByTestId('handle-out');
    await fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientX: 20, clientY: 20, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientX: 20, clientY: 20, pointerId: 1 });

    expect(onconnect).not.toHaveBeenCalled();
  });

  it('isValidConnection can reject the connection', async () => {
    const onconnect = vi.fn();
    const { getByTestId } = render(Harness, {
      props: { onconnect, dropTarget: { node: 'b', handle: 'in' }, isValidConnection: () => false }
    });

    const handle = getByTestId('handle-out');
    await fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientX: 80, clientY: 60, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientX: 80, clientY: 60, pointerId: 1 });

    expect(onconnect).not.toHaveBeenCalled();
  });

  it('a node with ports but none fitting never becomes a target', async () => {
    // returning toHandle: undefined here would be wrong — "no port means
    // compatible" is a rule about BARE nodes, and through that loophole a
    // drag from a target would reach any card
    const onconnect = vi.fn();
    const { getByTestId } = render(Harness, {
      props: { onconnect, fromType: 'target', dropTarget: { node: 'b' } }
    });

    const handle = getByTestId('handle-out');
    await fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientX: 80, clientY: 60, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientX: 80, clientY: 60, pointerId: 1 });

    expect(onconnect).not.toHaveBeenCalled();
  });

  it('target → target is rejected on direction', async () => {
    const onconnect = vi.fn();
    const { getByTestId } = render(Harness, {
      props: { onconnect, fromType: 'target', dropTarget: { node: 'b', handle: 'in' } }
    });

    const handle = getByTestId('handle-out');
    await fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientX: 80, clientY: 60, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientX: 80, clientY: 60, pointerId: 1 });

    expect(onconnect).not.toHaveBeenCalled();
  });

  it('Escape cancels the drag', async () => {
    const onconnect = vi.fn();
    const { container, getByTestId } = render(Harness, { props: { onconnect, dropTarget: { node: 'b' } } });

    const handle = getByTestId('handle-out');
    await fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientX: 80, clientY: 60, pointerId: 1 });
    await fireEvent.keyDown(window, { key: 'Escape' });

    expect(container.querySelector('path.fr-connection')).toBeNull();
    await fireEvent.pointerUp(handle, { clientX: 80, clientY: 60, pointerId: 1 });
    expect(onconnect).not.toHaveBeenCalled();
  });

  it('pointercancel kills the drag', async () => {
    const { container, getByTestId } = render(Harness);
    const handle = getByTestId('handle-out');
    await fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientX: 80, clientY: 60, pointerId: 1 });
    await fireEvent.pointerCancel(handle, { pointerId: 1 });

    expect(container.querySelector('path.fr-connection')).toBeNull();
  });

  it('removes the port from the registry on unmount', () => {
    const { unmount } = render(Harness);
    expect(() => unmount()).not.toThrow();
  });
});
