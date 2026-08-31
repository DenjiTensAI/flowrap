import type { EdgePathType, Position, Rect } from '../types';

/** Centre of a rectangle. */
export function centerOf(r: Rect): Position {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/**
 * Where a segment leaves a rectangle: `from` is the rect's centre, `to`
 * is the target. Returns where the ray from→to crosses the border.
 * If from === to, returns from.
 */
export function clipToRect(from: Position, to: Position, rect: Rect): Position {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return from;
  const tx = dx !== 0 ? rect.w / 2 / Math.abs(dx) : Infinity;
  const ty = dy !== 0 ? rect.h / 2 / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);
  return { x: from.x + dx * t, y: from.y + dy * t };
}

export function straightPath(a: Position, b: Position): string {
  return `M ${a.x},${a.y} L ${b.x},${b.y}`;
}

/** Horizontal take-off, like react-flow. */
export function bezierPath(a: Position, b: Position): string {
  // Floor of 20: on a vertical link |dx| is 0, and without it the control
  // points would collapse onto the endpoints and the curve would
  // degenerate into a straight line.
  const c = Math.max(Math.abs(b.x - a.x) * 0.5, 20);
  return `M ${a.x},${a.y} C ${a.x + c},${a.y} ${b.x - c},${b.y} ${b.x},${b.y}`;
}

/** Orthogonal, with the bend halfway along X. */
export function stepPath(a: Position, b: Position): string {
  const mx = (a.x + b.x) / 2;
  return `M ${a.x},${a.y} L ${mx},${a.y} L ${mx},${b.y} L ${b.x},${b.y}`;
}

/** Dispatch by type. */
export function edgePath(type: EdgePathType, a: Position, b: Position): string {
  switch (type) {
    case 'straight':
      return straightPath(a, b);
    case 'step':
      return stepPath(a, b);
    case 'bezier':
    default:
      return bezierPath(a, b);
  }
}
