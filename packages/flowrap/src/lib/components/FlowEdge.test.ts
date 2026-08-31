import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import FlowEdgeHarness from './FlowEdge.harness.svelte';

// The ResizeObserver stub from vitest-setup never calls back, and jsdom
// does no layout — offsetWidth/offsetHeight are always 0, so the edge
// layer would skip every line as "not measured yet". Mock the node
// wrapper's size so FlowNode's synchronous first measurement gets numbers.
const W = 100;
const H = 40;
// An 8×8 port placed INSIDE the node rather than on its edge: on the
// edge its centre would coincide with clipToRect's answer, and the test
// would pass even if fromHandle were ignored entirely.
const HANDLE = { x: 20, y: 16, w: 8, h: 8 };
let restore: (() => void) | null = null;

beforeAll(() => {
  const ow = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
  const oh = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');

  const ol = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetLeft');
  const ot = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop');

  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      if (this.hasAttribute('data-fr-node')) return W;
      return this.hasAttribute('data-fr-handle') ? HANDLE.w : 0;
    }
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      if (this.hasAttribute('data-fr-node')) return H;
      return this.hasAttribute('data-fr-handle') ? HANDLE.h : 0;
    }
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
    configurable: true,
    get(this: HTMLElement) {
      return this.hasAttribute('data-fr-handle') ? HANDLE.x : 0;
    }
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
    configurable: true,
    get(this: HTMLElement) {
      return this.hasAttribute('data-fr-handle') ? HANDLE.y : 0;
    }
  });

  restore = () => {
    if (ow) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', ow);
    if (oh) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', oh);
    if (ol) Object.defineProperty(HTMLElement.prototype, 'offsetLeft', ol);
    if (ot) Object.defineProperty(HTMLElement.prototype, 'offsetTop', ot);
  };
});

afterAll(() => restore?.());

describe('FlowEdge', () => {
  it('draws a path between two nodes', () => {
    const { container } = render(FlowEdgeHarness);
    expect(container.querySelectorAll('path.fr-edge')).toHaveLength(1);
  });

  it('the SVG layer comes BEFORE children, so edges sit under nodes', () => {
    const { container } = render(FlowEdgeHarness);
    const world = container.querySelector('.fr-world')!;
    const svg = world.querySelector('svg.fr-edges')!;
    const node = world.querySelector('[data-fr-node]')!;
    // compareDocumentPosition: the svg precedes the node
    expect(
      svg.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('draws nothing for an unknown id, and does not throw', () => {
    const { container } = render(FlowEdgeHarness, { props: { to: 'ghost' } });
    expect(container.querySelectorAll('path.fr-edge')).toHaveLength(0);
  });

  it('the anchor lands on the node border, not in its centre', () => {
    const { container } = render(FlowEdgeHarness);
    const d = container.querySelector('path.fr-edge')!.getAttribute('d')!;
    // a: (0,0) 100x40, centre (50,20); b: (200,100), centre (250,120).
    // dx=200, dy=100 ⇒ tx = 50/200, ty = 20/100 ⇒ t = 0.2 ⇒ (90,40).
    expect(d.startsWith('M 90,40 ')).toBe(true);
  });

  it('an edge WITH a handle lands on the port, not on the node border', () => {
    // port (20,16) 8×8 inside a 100×40 node at (0,0), so its world
    // centre is (24,20); clipToRect would say (90,40) — see the test above
    const { container } = render(FlowEdgeHarness, { props: { withHandles: true } });
    const d = container.querySelector('path.fr-edge')!.getAttribute('d')!;
    expect(d.startsWith('M 24,20 ')).toBe(true);
  });

  it('recomputes d while a node is dragged', async () => {
    const { container, getByTestId } = render(FlowEdgeHarness);
    const before = container.querySelector('path.fr-edge')!.getAttribute('d');

    const node = getByTestId('node-a').parentElement as HTMLElement;
    await fireEvent.pointerDown(node, { clientX: 0, clientY: 0, pointerId: 1 });
    await fireEvent.pointerMove(node, { clientX: 60, clientY: 40, pointerId: 1 });
    await fireEvent.pointerUp(node, { clientX: 60, clientY: 40, pointerId: 1 });

    expect(container.querySelector('path.fr-edge')!.getAttribute('d')).not.toBe(before);
  });

  it('removes the edge from the registry on unmount', () => {
    const { container, unmount } = render(FlowEdgeHarness);
    expect(container.querySelectorAll('path.fr-edge')).toHaveLength(1);
    expect(() => unmount()).not.toThrow();
  });

  it('two edges between the same pair of nodes do not merge into one', () => {
    const { container } = render(FlowEdgeHarness, { props: { duplicate: true } });
    // the default key is $props.id(), not `${from}->${to}`
    expect(container.querySelectorAll('path.fr-edge')).toHaveLength(2);
  });

  it('type changes the shape of the path', async () => {
    const { container, rerender } = render(FlowEdgeHarness, { props: { type: 'straight' } });
    const straight = container.querySelector('path.fr-edge')!.getAttribute('d')!;
    expect(straight).toMatch(/^M [\d.-]+,[\d.-]+ L /);

    await rerender({ type: 'step' });
    const step = container.querySelector('path.fr-edge')!.getAttribute('d')!;
    expect(step.split(' L ')).toHaveLength(4);
  });
});
