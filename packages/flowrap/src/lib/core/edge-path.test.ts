import { describe, it, expect } from 'vitest';
import {
  centerOf,
  clipToRect,
  straightPath,
  bezierPath,
  stepPath,
  edgePath
} from './edge-path';

describe('centerOf', () => {
  it('returns the centre of a rectangle', () => {
    expect(centerOf({ x: 10, y: 20, w: 100, h: 40 })).toEqual({ x: 60, y: 40 });
  });
});

describe('clipToRect', () => {
  const rect = { x: -50, y: -50, w: 100, h: 100 }; // centre (0,0), half-axes 50

  it('lands on the right edge for a dead-horizontal target', () => {
    expect(clipToRect({ x: 0, y: 0 }, { x: 200, y: 0 }, rect)).toEqual({ x: 50, y: 0 });
  });

  it('lands on the bottom edge for a dead-vertical target', () => {
    expect(clipToRect({ x: 0, y: 0 }, { x: 0, y: 200 }, rect)).toEqual({ x: 0, y: 50 });
  });

  it('hits the corner exactly on a 45° diagonal', () => {
    expect(clipToRect({ x: 0, y: 0 }, { x: 200, y: 200 }, rect)).toEqual({ x: 50, y: 50 });
  });

  it('picks the nearest edge, not always the horizontal one', () => {
    // dy is twice dx, so it exits through the bottom edge at x = 25
    expect(clipToRect({ x: 0, y: 0 }, { x: 100, y: 200 }, rect)).toEqual({ x: 25, y: 50 });
  });

  it('returns the point itself when there is no direction', () => {
    expect(clipToRect({ x: 0, y: 0 }, { x: 0, y: 0 }, rect)).toEqual({ x: 0, y: 0 });
  });
});

describe('path builders', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 100, y: 50 };

  it('straight: a plain segment', () => {
    expect(straightPath(a, b)).toBe('M 0,0 L 100,50');
  });

  it('bezier: horizontal take-off, control = half of dx', () => {
    expect(bezierPath(a, b)).toBe('M 0,0 C 50,0 50,50 100,50');
  });

  it('bezier: controls do not collapse on a vertical link', () => {
    // |dx| = 0, so the floor of 20 kicks in
    expect(bezierPath({ x: 0, y: 0 }, { x: 0, y: 80 })).toBe('M 0,0 C 20,0 -20,80 0,80');
  });

  it('step: orthogonal, bending halfway along X', () => {
    expect(stepPath(a, b)).toBe('M 0,0 L 50,0 L 50,50 L 100,50');
  });

  it('edgePath dispatches by type', () => {
    expect(edgePath('straight', a, b)).toBe(straightPath(a, b));
    expect(edgePath('bezier', a, b)).toBe(bezierPath(a, b));
    expect(edgePath('step', a, b)).toBe(stepPath(a, b));
  });
});
