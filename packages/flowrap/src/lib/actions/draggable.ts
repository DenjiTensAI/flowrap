import type { Position } from '../types';

export interface DraggableParams {
  /**
   * Start predicate. Called FIRST on pointerdown; return false and the
   * drag never starts, so setPointerCapture is never called either.
   *
   * FlowBoard needs it to tell a background drag from a node drag:
   * pointerdown on a node bubbles up to `.fr-viewport`, and while
   * setPointerCapture retargets events, it doesn't stop them bubbling.
   */
  filter?: (e: PointerEvent) => boolean;
  onDragStart?: (p: Position) => void;
  /**
   * The delta is INCREMENTAL — since the previous pointermove, not since
   * the start of the drag. Accumulate it yourself (x += delta.x).
   */
  onDrag: (delta: Position) => void;
  /**
   * ABSOLUTE cursor position for the same pointermove that fired onDrag.
   * Connectors need a point rather than an increment, and keeping their
   * own running total would mean a second copy of the cursor position
   * slowly drifting away from the real one.
   */
  onDragMove?: (p: Position) => void;
  onDragEnd?: (p: Position) => void;
  disabled?: boolean;
}

export interface DraggableAction {
  update(params: DraggableParams): void;
  destroy(): void;
}

/**
 * Pointer dragging for any element.
 *
 * pointermove/pointerup are listened for on the SAME element as
 * pointerdown, not on window — that's what setPointerCapture is for: the
 * browser keeps delivering events to the element even once the cursor
 * has left it.
 */
export function draggable(node: HTMLElement, params: DraggableParams): DraggableAction {
  let current = params;

  let activePointerId: number | null = null;
  let last: Position = { x: 0, y: 0 };

  function onPointerDown(e: PointerEvent) {
    if (activePointerId !== null) return;
    // filter goes first: it decides whether this drag is ours at all
    if (current.filter && !current.filter(e)) return;
    if (current.disabled) return;
    if (e.button !== 0) return; // primary button only

    activePointerId = e.pointerId;
    last = { x: e.clientX, y: e.clientY };

    // Kills the browser's native image drag and text selection.
    e.preventDefault();
    // Belt and braces on top of the board's filter: pointerdown on a node
    // must not reach .fr-viewport and start a pan.
    e.stopPropagation();

    node.setPointerCapture(e.pointerId);
    current.onDragStart?.({ x: e.clientX, y: e.clientY });
  }

  function onPointerMove(e: PointerEvent) {
    if (activePointerId === null) return;
    if (e.pointerId !== activePointerId) return; // ignore a second finger

    const delta = { x: e.clientX - last.x, y: e.clientY - last.y };
    last = { x: e.clientX, y: e.clientY };
    current.onDrag(delta);
    current.onDragMove?.({ x: e.clientX, y: e.clientY });
  }

  function endDrag(e: PointerEvent) {
    if (activePointerId === null) return;
    if (e.pointerId !== activePointerId) return;

    // Clear the state BEFORE releasePointerCapture: that fires
    // lostpointercapture, which lands right back in endDrag.
    const pointerId = activePointerId;
    activePointerId = null;
    releaseCapture(pointerId);
    current.onDragEnd?.({ x: e.clientX, y: e.clientY });
  }

  function releaseCapture(pointerId: number) {
    try {
      node.releasePointerCapture(pointerId);
    } catch {
      // Pointer is already gone — the browser dropped the capture itself.
    }
  }

  node.addEventListener('pointerdown', onPointerDown);
  node.addEventListener('pointermove', onPointerMove);
  node.addEventListener('pointerup', endDrag);
  node.addEventListener('pointercancel', endDrag);
  node.addEventListener('lostpointercapture', endDrag);

  return {
    update(next: DraggableParams) {
      current = next;
    },
    destroy() {
      if (activePointerId !== null) {
        releaseCapture(activePointerId);
        activePointerId = null;
      }
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', endDrag);
      node.removeEventListener('pointercancel', endDrag);
      node.removeEventListener('lostpointercapture', endDrag);
    }
  };
}
