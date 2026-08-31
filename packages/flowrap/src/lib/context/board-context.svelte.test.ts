import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import { createBoardContext } from './board-context.svelte';
import type { Viewport } from '../types';

function makeViewport(overrides: Partial<Viewport> = {}): Viewport {
  return { pan: { x: 0, y: 0 }, zoom: 1, ...overrides };
}

describe('createBoardContext', () => {
  it('registers and unregisters a node', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.registerNode('a', { x: 10, y: 20 });

    expect(ctx.nodes.has('a')).toBe(true);
    expect(ctx.nodes.get('a')).toMatchObject({ id: 'a', x: 10, y: 20 });

    ctx.unregisterNode('a');
    expect(ctx.nodes.has('a')).toBe(false);
  });

  it('updateNode touches only the record it was given', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.registerNode('a', { x: 0, y: 0 });
    ctx.registerNode('b', { x: 5, y: 5 });

    ctx.updateNode('a', { x: 100, y: 200 });

    expect(ctx.nodes.get('a')).toMatchObject({ x: 100, y: 200 });
    expect(ctx.nodes.get('b')).toMatchObject({ x: 5, y: 5 });
  });

  it('setNodeEl attaches the DOM ref without touching x/y', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.registerNode('a', { x: 1, y: 2 });
    const el = document.createElement('div');

    ctx.setNodeEl('a', el);

    expect(ctx.nodes.get('a')?.el).toBe(el);
    expect(ctx.nodes.get('a')).toMatchObject({ x: 1, y: 2 });
  });

  it('delegates screenToFlow/flowToScreen to the current viewport', () => {
    const getViewport = vi.fn(() => makeViewport({ zoom: 2 }));
    const ctx = createBoardContext(getViewport);

    expect(ctx.screenToFlow({ x: 200, y: 100 })).toEqual({ x: 100, y: 50 });
    expect(getViewport).toHaveBeenCalled();
  });

  it('updateNode (node → board) leaves rev alone', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.registerNode('a', { x: 0, y: 0 });
    const rev = ctx.nodes.get('a')!.rev;

    ctx.updateNode('a', { x: 50, y: 60 });

    expect(ctx.nodes.get('a')).toMatchObject({ x: 50, y: 60 });
    expect(ctx.nodes.get('a')!.rev).toBe(rev);
  });

  it('applyPositions (board → node) writes positions and bumps rev', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.registerNode('a', { x: 0, y: 0 });
    ctx.registerNode('b', { x: 5, y: 5 });
    const revA = ctx.nodes.get('a')!.rev;
    const revB = ctx.nodes.get('b')!.rev;

    ctx.applyPositions({ a: { x: 100, y: 200 }, b: { x: 5, y: 5 } });

    expect(ctx.nodes.get('a')).toMatchObject({ x: 100, y: 200 });
    expect(ctx.nodes.get('a')!.rev).toBeGreaterThan(revA);
    // b's value didn't change, so rev stays put and the node sits still
    expect(ctx.nodes.get('b')!.rev).toBe(revB);
  });

  it('applyPositions ignores unknown ids silently', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.registerNode('a', { x: 0, y: 0 });

    expect(() => ctx.applyPositions({ ghost: { x: 1, y: 1 } })).not.toThrow();
    expect(ctx.nodes.has('ghost')).toBe(false);
  });

  it('nodes is reactive on mutation (SvelteMap, not Map)', () => {
    const ctx = createBoardContext(() => makeViewport());
    let runs = 0;

    const cleanup = $effect.root(() => {
      $effect(() => {
        ctx.nodes.size; // subscribe to the collection
        runs++;
      });
    });
    flushSync();
    const before = runs;

    ctx.registerNode('a', { x: 0, y: 0 });
    flushSync();

    // With a plain `$state(new Map())` this expect fails: .set() isn't
    // reactive and bind:positions quietly stops working.
    expect(runs).toBeGreaterThan(before);
    cleanup();
  });
});

describe('board context: node sizes and edges', () => {
  it('registerNode starts a node at zero size', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.registerNode('a', { x: 0, y: 0 });
    expect(ctx.nodes.get('a')).toMatchObject({ w: 0, h: 0 });
  });

  it('setNodeSize writes the world size and leaves rev alone', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.registerNode('a', { x: 0, y: 0 });
    ctx.applyPositions({ a: { x: 5, y: 5 } }); // rev → 1
    const rev = ctx.nodes.get('a')!.rev;

    ctx.setNodeSize('a', 120, 40);

    expect(ctx.nodes.get('a')).toMatchObject({ w: 120, h: 40, rev });
  });

  it('setNodeSize keeps the record when the size has not changed', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.registerNode('a', { x: 0, y: 0 });
    ctx.setNodeSize('a', 120, 40);
    const rec = ctx.nodes.get('a');

    // Bailing out early is correctness, not thrift: ResizeObserver also
    // fires for changes that leave the numbers alone.
    ctx.setNodeSize('a', 120, 40);

    expect(ctx.nodes.get('a')).toBe(rec);
  });

  it('setNodeSize ignores an unknown id silently', () => {
    const ctx = createBoardContext(() => makeViewport());
    expect(() => ctx.setNodeSize('ghost', 10, 10)).not.toThrow();
    expect(ctx.nodes.has('ghost')).toBe(false);
  });

  it('registerEdge / unregisterEdge keep the edge registry', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.registerEdge('e1', { key: 'e1', from: 'a', to: 'b', type: 'bezier' });

    expect(ctx.edges.get('e1')).toMatchObject({ from: 'a', to: 'b', type: 'bezier' });

    ctx.unregisterEdge('e1');
    expect(ctx.edges.has('e1')).toBe(false);
  });

  it('updateEdge keeps the record when no field has changed', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.registerEdge('e1', { key: 'e1', from: 'a', to: 'b', type: 'bezier' });
    const rec = ctx.edges.get('e1');

    ctx.updateEdge('e1', { key: 'e1', from: 'a', to: 'b', type: 'bezier' });
    expect(ctx.edges.get('e1')).toBe(rec);

    ctx.updateEdge('e1', { key: 'e1', from: 'a', to: 'b', type: 'step' });
    expect(ctx.edges.get('e1')!.type).toBe('step');
  });

  it('two edges between the same pair of nodes get separate keys', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.registerEdge('e1', { key: 'e1', from: 'a', to: 'b', type: 'bezier' });
    ctx.registerEdge('e2', { key: 'e2', from: 'a', to: 'b', type: 'bezier' });
    expect(ctx.edges.size).toBe(2);
  });

  it('edges is reactive on mutation (SvelteMap, not Map)', () => {
    const ctx = createBoardContext(() => makeViewport());
    let runs = 0;

    const cleanup = $effect.root(() => {
      $effect(() => {
        ctx.edges.size; // subscribe to the collection
        runs++;
      });
    });
    flushSync();
    const before = runs;

    ctx.registerEdge('e1', { key: 'e1', from: 'a', to: 'b', type: 'bezier' });
    flushSync();

    expect(runs).toBeGreaterThan(before);
    cleanup();
  });

  // --- ports and dragging ---

  it('registers a port under `nodeId:handleId` and removes it again', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.registerHandle({ nodeId: 'a', handleId: 'out', type: 'source', x: 0, y: 0, w: 0, h: 0 });

    expect(ctx.handles.has('a:out')).toBe(true);

    ctx.unregisterHandle('a', 'out');
    expect(ctx.handles.has('a:out')).toBe(false);
  });

  it('same-named ports on different nodes do not collide', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.registerHandle({ nodeId: 'a', handleId: 'in', type: 'target', x: 0, y: 0, w: 0, h: 0 });
    ctx.registerHandle({ nodeId: 'b', handleId: 'in', type: 'target', x: 0, y: 0, w: 0, h: 0 });

    expect(ctx.handles.size).toBe(2);
  });

  it('setHandleGeometry keeps the record when the geometry is the same', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.registerHandle({ nodeId: 'a', handleId: 'out', type: 'source', x: 0, y: 0, w: 0, h: 0 });

    ctx.setHandleGeometry('a', 'out', 90, 15, 10, 10);
    const rec = ctx.handles.get('a:out');
    expect(rec).toMatchObject({ x: 90, y: 15, w: 10, h: 10, type: 'source' });

    ctx.setHandleGeometry('a', 'out', 90, 15, 10, 10);
    expect(ctx.handles.get('a:out')).toBe(rec);

    ctx.setHandleGeometry('a', 'out', 91, 15, 10, 10);
    expect(ctx.handles.get('a:out')).not.toBe(rec);
  });

  it('setHandleGeometry on an unregistered port does nothing', () => {
    const ctx = createBoardContext(() => makeViewport());
    expect(() => ctx.setHandleGeometry('ghost', 'out', 1, 2, 3, 4)).not.toThrow();
    expect(ctx.handles.size).toBe(0);
  });

  it('startConnection opens the state, endConnection returns the link', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.startConnection('a', 'out', { x: 10, y: 10 });
    expect(ctx.connection).toMatchObject({ from: 'a', fromHandle: 'out', target: null });

    ctx.moveConnection({ x: 50, y: 50 }, { node: 'b', handle: 'in' });
    expect(ctx.connection).toMatchObject({
      cursor: { x: 50, y: 50 },
      target: { node: 'b', handle: 'in' }
    });

    expect(ctx.endConnection()).toEqual({
      from: 'a',
      to: 'b',
      fromHandle: 'out',
      toHandle: 'in'
    });
    expect(ctx.connection).toBeNull();
  });

  it('endConnection clears the state EVEN WHEN IT REJECTS', () => {
    // otherwise a rejected drop leaves the preview line hanging
    const ctx = createBoardContext(() => makeViewport(), { canConnect: () => false });
    ctx.startConnection('a', 'out', { x: 0, y: 0 });
    ctx.moveConnection({ x: 50, y: 50 }, { node: 'b', handle: 'in' });

    expect(ctx.endConnection()).toBeNull();
    expect(ctx.connection).toBeNull();
  });

  it('endConnection with no target returns null and clears the state', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.startConnection('a', 'out', { x: 0, y: 0 });
    ctx.moveConnection({ x: 50, y: 50 }, null);

    expect(ctx.endConnection()).toBeNull();
    expect(ctx.connection).toBeNull();
  });

  it('endConnection outside a drag returns null and does not throw', () => {
    const ctx = createBoardContext(() => makeViewport());
    expect(ctx.endConnection()).toBeNull();
  });

  it('moveConnection stores only a valid target', () => {
    const ctx = createBoardContext(() => makeViewport(), {
      canConnect: (c) => c.to === 'ok'
    });
    ctx.startConnection('a', 'out', { x: 0, y: 0 });

    ctx.moveConnection({ x: 1, y: 1 }, { node: 'nope' });
    expect(ctx.connection!.target).toBeNull();
    expect(ctx.connection!.cursor).toEqual({ x: 1, y: 1 });

    ctx.moveConnection({ x: 2, y: 2 }, { node: 'ok' });
    expect(ctx.connection!.target).toEqual({ node: 'ok' });
  });

  it('moveConnection outside a drag starts nothing', () => {
    const ctx = createBoardContext(() => makeViewport());
    ctx.moveConnection({ x: 1, y: 1 }, { node: 'b' });
    expect(ctx.connection).toBeNull();
  });

  it('emitConnect calls the board callback', () => {
    const onConnect = vi.fn();
    const ctx = createBoardContext(() => makeViewport(), { onConnect });
    const c = { from: 'a', to: 'b' };

    ctx.emitConnect(c);
    expect(onConnect).toHaveBeenCalledWith(c);
  });

  it('handles is reactive on mutation (SvelteMap, not Map)', () => {
    const ctx = createBoardContext(() => makeViewport());
    let runs = 0;

    const cleanup = $effect.root(() => {
      $effect(() => {
        ctx.handles.size;
        runs++;
      });
    });
    flushSync();
    const before = runs;

    ctx.registerHandle({ nodeId: 'a', handleId: 'out', type: 'both', x: 0, y: 0, w: 0, h: 0 });
    flushSync();

    expect(runs).toBeGreaterThan(before);
    cleanup();
  });

  it('connection is reactive ($state, not a plain field)', () => {
    const ctx = createBoardContext(() => makeViewport());
    let seen: unknown = 'unset';

    const cleanup = $effect.root(() => {
      $effect(() => {
        seen = ctx.connection;
      });
    });
    flushSync();
    expect(seen).toBeNull();

    ctx.startConnection('a', 'out', { x: 0, y: 0 });
    flushSync();
    expect(seen).toMatchObject({ from: 'a' });

    ctx.endConnection();
    flushSync();
    expect(seen).toBeNull();
    cleanup();
  });
});
