import { describe, it, expect } from 'vitest';
import { screenToFlow, flowToScreen, zoomAtPoint, scaleDelta } from './coordinates';
import type { Viewport } from '../types';

describe('screenToFlow / flowToScreen', () => {
  it('is the identity at zoom=1 and pan={0,0}', () => {
    const viewport: Viewport = { pan: { x: 0, y: 0 }, zoom: 1 };
    const p = { x: 123, y: 45 };
    expect(screenToFlow(p, viewport)).toEqual(p);
    expect(flowToScreen(p, viewport)).toEqual(p);
  });

  it('screenToFlow and flowToScreen invert each other at any zoom/pan', () => {
    const viewport: Viewport = { pan: { x: 40, y: -20 }, zoom: 2.5 };
    const p = { x: 300, y: 150 };
    const flow = screenToFlow(p, viewport);
    const back = flowToScreen(flow, viewport);
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
  });

  it('scales correctly at zoom=2', () => {
    const viewport: Viewport = { pan: { x: 0, y: 0 }, zoom: 2 };
    expect(screenToFlow({ x: 200, y: 100 }, viewport)).toEqual({ x: 100, y: 50 });
  });
});

describe('zoomAtPoint', () => {
  it('keeps the world point under the cursor pinned to the screen', () => {
    const viewport: Viewport = { pan: { x: 0, y: 0 }, zoom: 1 };
    const cursor = { x: 150, y: 80 };

    const worldBefore = screenToFlow(cursor, viewport);
    const nextPan = zoomAtPoint(cursor, viewport, 2);
    const nextViewport: Viewport = { pan: nextPan, zoom: 2 };
    const screenAfter = flowToScreen(worldBefore, nextViewport);

    expect(screenAfter.x).toBeCloseTo(cursor.x);
    expect(screenAfter.y).toBeCloseTo(cursor.y);
  });
});

describe('scaleDelta', () => {
  it('halves the delta at zoom=2', () => {
    expect(scaleDelta({ x: 10, y: -20 }, 2)).toEqual({ x: 5, y: -10 });
  });

  it('is the identity at zoom=1', () => {
    expect(scaleDelta({ x: 7, y: 3 }, 1)).toEqual({ x: 7, y: 3 });
  });
});
