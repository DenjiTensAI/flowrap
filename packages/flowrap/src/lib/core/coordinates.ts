import type { Position, Viewport } from '../types';

/**
 * Screen point (local to `.fr-viewport` — its top-left corner is {0,0})
 * → world coordinate. Converting from clientX/clientY is the component's
 * job: `{ x: e.clientX - rect.left, y: e.clientY - rect.top }`.
 */
export function screenToFlow(p: Position, viewport: Viewport): Position {
  return {
    x: (p.x - viewport.pan.x) / viewport.zoom,
    y: (p.y - viewport.pan.y) / viewport.zoom
  };
}

/** World coordinate → screen point, local to `.fr-viewport`. */
export function flowToScreen(p: Position, viewport: Viewport): Position {
  return {
    x: p.x * viewport.zoom + viewport.pan.x,
    y: p.y * viewport.zoom + viewport.pan.y
  };
}

/**
 * New pan for zoom-to-cursor: the world point under the cursor stays put
 * on screen after zoom changes to nextZoom.
 *
 *   pan' = cursor - (cursor - pan) / zoom * nextZoom
 */
export function zoomAtPoint(
  cursor: Position,
  viewport: Viewport,
  nextZoom: number
): Position {
  const world = screenToFlow(cursor, viewport);
  return {
    x: cursor.x - world.x * nextZoom,
    y: cursor.y - world.y * nextZoom
  };
}

/**
 * Screen delta → world delta. Without this a node outruns (or lags
 * behind) the cursor at zoom ≠ 1. Board panning does NOT use it — that
 * delta stays in screen units.
 */
export function scaleDelta(delta: Position, zoom: number): Position {
  return { x: delta.x / zoom, y: delta.y / zoom };
}
