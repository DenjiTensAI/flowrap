import { centerOf, clipToRect } from './edge-path';
import type { HandleRecord, HandleType, Position, Rect } from '../types';

/**
 * A port's centre in world coordinates.
 *
 * rec.x/rec.y are an offset RELATIVE to the node (offsetLeft/offsetTop,
 * already in world units), so we just add the node's position — nothing
 * gets divided by zoom.
 */
export function handleCenter(node: Position, rec: HandleRecord): Position {
  return { x: node.x + rec.x + rec.w / 2, y: node.y + rec.y + rec.h / 2 };
}

/**
 * Where an edge end attaches.
 *
 * With a port: its centre, and we do NOT clip to the node's rectangle —
 * the port sits exactly where the consumer's markup put it, and pulling
 * it to the border would move the line off the thing you aimed at.
 * Without a port: the node's centre clipped to its
 * rectangle in the direction of the target.
 */
export function anchorFor(
  rect: Rect,
  handle: HandleRecord | undefined,
  towards: Position
): Position {
  if (handle) return handleCenter({ x: rect.x, y: rect.y }, handle);
  const c = centerOf(rect);
  return clipToRect(c, towards, rect);
}

/**
 * The node's port nearest to the cursor.
 *
 * This is for drops that land on the card rather than exactly on a dot:
 * you aimed at a node that has a port drawn on it, so the link belongs in
 * that port, not at some arbitrary point on the border. It is not a
 * radius magnet — only ports of the node the hit test already picked are
 * considered.
 *
 * undefined when the node has no suitable port; the caller then falls
 * back to anchoring on the node's border.
 */
export function nearestHandle(
  node: Position,
  handles: HandleRecord[],
  cursor: Position,
  from: HandleType | undefined
): HandleRecord | undefined {
  let best: HandleRecord | undefined;
  let bestDistance = Infinity;
  for (const h of handles) {
    if (!directionsCompatible(from, h.type)) continue;
    const c = handleCenter(node, h);
    // squared distance — the square root wouldn't change the ordering
    const d = (c.x - cursor.x) ** 2 + (c.y - cursor.y) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = h;
    }
  }
  return best;
}

/** Do the port directions allow this drop? */
export function directionsCompatible(
  from: HandleType | undefined,
  to: HandleType | undefined
): boolean {
  // No port at all (a drop on a bare node) goes with anything.
  if (from === undefined || to === undefined) return true;
  // A source can't be an end, a target can't be a start.
  if (from === 'target') return false;
  if (to === 'source') return false;
  return true;
}
