import '@testing-library/jest-dom/vitest';

// --- PointerEvent: jsdom doesn't implement it (jsdom#2527) ---
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;
    width: number;
    height: number;
    pressure: number;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params); // clientX/clientY/button come from here
      this.pointerId = params.pointerId ?? 0;
      this.pointerType = params.pointerType ?? 'mouse';
      this.isPrimary = params.isPrimary ?? true;
      this.width = params.width ?? 1;
      this.height = params.height ?? 1;
      this.pressure = params.pressure ?? 0.5;
    }
  }

  // BOTH assignments are needed — vitest#2648: in Vitest
  // window !== document.defaultView, and @testing-library takes the event
  // constructor from element.ownerDocument.defaultView.
  (window as unknown as Record<string, unknown>).PointerEvent = PointerEventPolyfill;
  (document.defaultView as unknown as Record<string, unknown>).PointerEvent =
    PointerEventPolyfill;
  (globalThis as unknown as Record<string, unknown>).PointerEvent = PointerEventPolyfill;
}

// --- pointer capture: jsdom doesn't have that either ---
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = function () {};
  Element.prototype.releasePointerCapture = function () {};
  Element.prototype.hasPointerCapture = function () {
    return false;
  };
}

// --- ResizeObserver: jsdom doesn't have that either ---
// The stub NEVER calls back, so node w/h stay zero under jsdom. Component
// tests for edges have to set the size themselves.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub implements ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as Record<string, unknown>).ResizeObserver = ResizeObserverStub;
  (window as unknown as Record<string, unknown>).ResizeObserver = ResizeObserverStub;
}
