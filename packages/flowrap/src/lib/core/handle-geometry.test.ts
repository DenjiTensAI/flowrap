import { describe, it, expect } from 'vitest';
import { handleCenter, anchorFor, directionsCompatible, nearestHandle } from './handle-geometry';
import type { HandleRecord } from '../types';

const h = (over: Partial<HandleRecord> = {}): HandleRecord => ({
  nodeId: 'a', handleId: 'out', type: 'both', x: 90, y: 15, w: 10, h: 10, ...over
});

describe('handleCenter', () => {
  it('adds the node position to the port offset', () => {
    // the port's offset is in world units, RELATIVE to the node
    expect(handleCenter({ x: 100, y: 200 }, h())).toEqual({ x: 195, y: 220 });
  });

  it('does not depend on the node size', () => {
    expect(handleCenter({ x: 0, y: 0 }, h())).toEqual({ x: 95, y: 20 });
  });
});

describe('anchorFor', () => {
  const rect = { x: 0, y: 0, w: 100, h: 40 };   // centre (50,20)
  const towards = { x: 400, y: 20 };

  it('without a port: a point on the node border', () => {
    // dead-horizontal target, so the right edge
    expect(anchorFor(rect, undefined, towards)).toEqual({ x: 100, y: 20 });
  });

  it('with a port, returns the port centre instead of the border', () => {
    expect(anchorFor(rect, h({ x: 96, y: 16, w: 8, h: 8 }), towards)).toEqual({ x: 100, y: 20 });
  });

  it('a port inside the node is not pulled out to the border', () => {
    // port sits in the middle on purpose: the anchor must stay there
    expect(anchorFor(rect, h({ x: 20, y: 16, w: 8, h: 8 }), towards)).toEqual({ x: 24, y: 20 });
  });
});

describe('directionsCompatible', () => {
  it('source → target is allowed', () => {
    expect(directionsCompatible('source', 'target')).toBe(true);
  });

  it('a target cannot be a start', () => {
    expect(directionsCompatible('target', 'target')).toBe(false);
  });

  it('a source cannot be an end', () => {
    expect(directionsCompatible('source', 'source')).toBe(false);
  });

  it('both works in either direction', () => {
    expect(directionsCompatible('both', 'target')).toBe(true);
    expect(directionsCompatible('source', 'both')).toBe(true);
  });

  it('no port at all (a drop on a bare node) goes with anything', () => {
    expect(directionsCompatible('source', undefined)).toBe(true);
    expect(directionsCompatible(undefined, 'source')).toBe(true);
  });
});

describe('nearestHandle', () => {
  const node = { x: 0, y: 0 };
  const left = h({ handleId: 'in', type: 'target', x: -5, y: 16, w: 10, h: 10 });
  const right = h({ handleId: 'out', type: 'source', x: 95, y: 16, w: 10, h: 10 });

  it('picks the port closest to the cursor', () => {
    // port centres: (0,21) and (100,21)
    expect(nearestHandle(node, [left, right], { x: 90, y: 30 }, undefined)).toBe(right);
    expect(nearestHandle(node, [left, right], { x: 10, y: 30 }, undefined)).toBe(left);
  });

  it('measures from the NODE POSITION, not from the origin', () => {
    // same node moved to (500,500): the nearer port must change
    const moved = { x: 500, y: 500 };
    expect(nearestHandle(moved, [left, right], { x: 590, y: 530 }, undefined)).toBe(right);
    expect(nearestHandle(moved, [left, right], { x: 510, y: 530 }, undefined)).toBe(left);
  });

  it('skips ports that point the wrong way', () => {
    // dragging from a source: another source is off limits, closer or not
    expect(nearestHandle(node, [right, left], { x: 99, y: 21 }, 'source')).toBe(left);
  });

  it('returns undefined when no port fits', () => {
    expect(nearestHandle(node, [right], { x: 99, y: 21 }, 'source')).toBeUndefined();
    expect(nearestHandle(node, [], { x: 0, y: 0 }, undefined)).toBeUndefined();
  });

  it('both is a valid target for source and for both', () => {
    const any = h({ handleId: 'p', type: 'both', x: 45, y: 16, w: 10, h: 10 });
    expect(nearestHandle(node, [any], { x: 50, y: 21 }, 'source')).toBe(any);
    expect(nearestHandle(node, [any], { x: 50, y: 21 }, 'both')).toBe(any);
    // dragging FROM a target is not a thing — no target can match
    expect(nearestHandle(node, [any], { x: 50, y: 21 }, 'target')).toBeUndefined();
  });
});
