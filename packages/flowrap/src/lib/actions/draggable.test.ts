import { describe, it, expect, vi, beforeEach } from 'vitest';
import { draggable } from './draggable';

function firePointer(el: HTMLElement, type: string, x: number, y: number, pointerId = 1) {
  el.dispatchEvent(
    new PointerEvent(type, { clientX: x, clientY: y, pointerId, bubbles: true })
  );
}

describe('draggable action', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('div');
    document.body.appendChild(el);
    // jsdom has no pointer capture — a stub is plenty
    el.setPointerCapture = vi.fn();
    el.releasePointerCapture = vi.fn();
  });

  it('calls onDragStart → onDrag(delta) → onDragEnd in order', () => {
    const onDragStart = vi.fn();
    const onDrag = vi.fn();
    const onDragEnd = vi.fn();

    draggable(el, { onDragStart, onDrag, onDragEnd });

    firePointer(el, 'pointerdown', 100, 100);
    expect(onDragStart).toHaveBeenCalledWith({ x: 100, y: 100 });
    expect(el.setPointerCapture).toHaveBeenCalledWith(1);

    firePointer(el, 'pointermove', 110, 130);
    expect(onDrag).toHaveBeenCalledWith({ x: 10, y: 30 });

    firePointer(el, 'pointermove', 115, 125);
    expect(onDrag).toHaveBeenLastCalledWith({ x: 5, y: -5 });

    firePointer(el, 'pointerup', 115, 125);
    expect(onDragEnd).toHaveBeenCalledWith({ x: 115, y: 125 });
  });

  it('does not start a drag when disabled: true', () => {
    const onDrag = vi.fn();
    draggable(el, { onDrag, disabled: true });

    firePointer(el, 'pointerdown', 50, 50);
    firePointer(el, 'pointermove', 80, 80);

    expect(onDrag).not.toHaveBeenCalled();
  });

  it('update() toggles disabled without re-attaching listeners', () => {
    const onDrag = vi.fn();
    const action = draggable(el, { onDrag, disabled: true });

    action.update({ onDrag, disabled: false });

    firePointer(el, 'pointerdown', 10, 10);
    firePointer(el, 'pointermove', 20, 20);

    expect(onDrag).toHaveBeenCalledWith({ x: 10, y: 10 });
  });

  it('destroy() removes the listeners', () => {
    const onDrag = vi.fn();
    const action = draggable(el, { onDrag });
    action.destroy();

    firePointer(el, 'pointerdown', 10, 10);
    firePointer(el, 'pointermove', 20, 20);

    expect(onDrag).not.toHaveBeenCalled();
  });

  it('does not start a drag when filter returns false', () => {
    const onDrag = vi.fn();
    const filter = vi.fn(() => false);
    draggable(el, { onDrag, filter });

    firePointer(el, 'pointerdown', 10, 10);
    firePointer(el, 'pointermove', 40, 40);

    expect(filter).toHaveBeenCalled();
    expect(onDrag).not.toHaveBeenCalled();
    expect(el.setPointerCapture).not.toHaveBeenCalled();
  });

  it('ignores non-primary buttons', () => {
    const onDrag = vi.fn();
    draggable(el, { onDrag });

    el.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 0,
        clientY: 0,
        pointerId: 1,
        button: 2,
        bubbles: true
      })
    );
    firePointer(el, 'pointermove', 30, 30);

    expect(onDrag).not.toHaveBeenCalled();
  });

  it('ignores events from another pointerId mid-drag', () => {
    const onDrag = vi.fn();
    draggable(el, { onDrag });

    firePointer(el, 'pointerdown', 0, 0, 1);
    firePointer(el, 'pointermove', 10, 10, 99); // a second finger
    expect(onDrag).not.toHaveBeenCalled();

    firePointer(el, 'pointermove', 10, 10, 1);
    expect(onDrag).toHaveBeenCalledWith({ x: 10, y: 10 });
  });

  it('onDragMove hands over the ABSOLUTE cursor point, not an increment', () => {
    // Purely additive: onDrag is still incremental,
    // there's just a second callback next to it for connectors.
    const onDrag = vi.fn();
    const onDragMove = vi.fn();

    draggable(el, { onDrag, onDragMove });

    firePointer(el, 'pointerdown', 100, 100);
    firePointer(el, 'pointermove', 130, 140);
    firePointer(el, 'pointermove', 150, 150);

    expect(onDrag.mock.calls).toEqual([[{ x: 30, y: 40 }], [{ x: 20, y: 10 }]]);
    expect(onDragMove.mock.calls).toEqual([[{ x: 130, y: 140 }], [{ x: 150, y: 150 }]]);
  });

  it('a drag without onDragMove works exactly as before', () => {
    const onDrag = vi.fn();
    draggable(el, { onDrag });

    firePointer(el, 'pointerdown', 0, 0);
    expect(() => firePointer(el, 'pointermove', 10, 10)).not.toThrow();
    expect(onDrag).toHaveBeenCalledWith({ x: 10, y: 10 });
  });

  it('pointercancel ends the drag just like pointerup', () => {
    const onDrag = vi.fn();
    const onDragEnd = vi.fn();
    draggable(el, { onDrag, onDragEnd });

    firePointer(el, 'pointerdown', 0, 0);
    firePointer(el, 'pointercancel', 5, 5);
    expect(onDragEnd).toHaveBeenCalled();

    onDrag.mockClear();
    firePointer(el, 'pointermove', 50, 50);
    expect(onDrag).not.toHaveBeenCalled();
  });
});
