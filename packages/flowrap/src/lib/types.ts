import type { SvelteMap } from 'svelte/reactivity';

export interface Position {
  x: number;
  y: number;
}

/** A node's rectangle, in world coordinates. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Viewport {
  pan: Position;
  zoom: number;
}

export interface NodeRecord {
  id: string;
  x: number;
  y: number;
  /**
   * World size, from offsetWidth/offsetHeight. Those are NOT scaled by
   * the .fr-world transform, unlike getBoundingClientRect. Zero until
   * the first ResizeObserver callback.
   */
  w: number;
  h: number;
  el: HTMLElement | null;
  /**
   * Bumped only when the position is assigned from OUTSIDE, i.e. in
   * applyPositions (board → node), never in updateNode (node → board).
   * A node watches this to tell "someone set my position" apart from
   * "I just moved myself".
   */
  rev: number;
}

export type EdgePathType = 'straight' | 'bezier' | 'step';

export interface EdgeRecord {
  key: string;
  from: string;
  to: string;
  type: EdgePathType;
  /**
   * Ports at either end. They move the geometry: the anchor sits on the
   * port's centre instead of the node's border (see anchorFor).
   */
  fromHandle?: string;
  toHandle?: string;
}

export type HandleType = 'source' | 'target' | 'both';

/**
 * A port in the board's registry.
 *
 * x/y are an offset RELATIVE to the node wrapper (offsetLeft/offsetTop),
 * not a world point: the node moves and the port goes with it, so storing
 * absolutes would mean rewriting every record on every drag frame. Like
 * the node's size, offset* is already in world units — the .fr-world
 * transform doesn't scale it, unlike getBoundingClientRect.
 */
export interface HandleRecord {
  nodeId: string;
  handleId: string;
  type: HandleType;
  /** offsetLeft/offsetTop, relative to the node wrapper. */
  x: number;
  y: number;
  /** offsetWidth/offsetHeight. Zero until first measured. */
  w: number;
  h: number;
}

/** What a finished drag hands to onconnect. */
export interface Connection {
  from: string;
  to: string;
  fromHandle?: string;
  toHandle?: string;
}

/** An in-flight drag. null when nobody is dragging. */
export interface ConnectionState {
  from: string;
  fromHandle?: string;
  /** Cursor in world coordinates — where the preview line ends. */
  cursor: Position;
  /** Target under the cursor, but only if connecting to it is valid. */
  target: { node: string; handle?: string } | null;
}

export interface BoardContext {
  registerNode(id: string, initial: Position): void;
  unregisterNode(id: string): void;
  /** node → board. Leaves rev alone. */
  updateNode(id: string, pos: Position): void;
  setNodeEl(id: string, el: HTMLElement): void;
  /** node → board. Leaves rev alone, same as updateNode. */
  setNodeSize(id: string, w: number, h: number): void;
  /**
   * board → node. Writes x/y and bumps rev, but only for records that
   * actually changed. Unknown keys are ignored silently — the node may
   * simply not be mounted yet.
   */
  applyPositions(positions: Record<string, Position>): void;
  getViewport(): Viewport;
  screenToFlow(p: Position): Position;
  flowToScreen(p: Position): Position;
  /**
   * SvelteMap, not Map. In Svelte 5, `$state(new Map())` makes the
   * reference reactive but not the mutations: `$state` proxies plain
   * objects and arrays, never collections. With a plain Map the context
   * unit tests would still pass (they read through has/get) while
   * bind:positions quietly stopped updating.
   */
  nodes: SvelteMap<string, NodeRecord>;

  registerEdge(key: string, edge: EdgeRecord): void;
  updateEdge(key: string, edge: EdgeRecord): void;
  unregisterEdge(key: string): void;
  /** SvelteMap, for the same reason as nodes. */
  edges: SvelteMap<string, EdgeRecord>;

  /** Keyed by `${nodeId}:${handleId}`. SvelteMap, like nodes and edges. */
  handles: SvelteMap<string, HandleRecord>;
  registerHandle(rec: HandleRecord): void;
  setHandleGeometry(
    nodeId: string,
    handleId: string,
    x: number,
    y: number,
    w: number,
    h: number
  ): void;
  unregisterHandle(nodeId: string, handleId: string): void;

  /**
   * null when no drag is in flight. A single value that gets replaced
   * wholesale, so $state is enough — no SvelteMap needed.
   */
  connection: ConnectionState | null;
  startConnection(from: string, fromHandle: string | undefined, cursor: Position): void;
  moveConnection(cursor: Position, target: ConnectionState['target']): void;
  /** The connection if the drop is valid, else null. Always clears the state. */
  endConnection(): Connection | null;

  /** Connection policy. The board supplies the implementation. */
  canConnect(c: Connection): boolean;
  /**
   * What sits under a screen point. The board supplies it — the one
   * place where the core touches the DOM directly.
   */
  hitTest(clientX: number, clientY: number): ConnectionState['target'];
  /**
   * clientX/clientY → world point. Separate from screenToFlow, which
   * wants coordinates local to .fr-viewport: only the board knows the
   * viewport's rectangle.
   */
  clientToFlow(p: Position): Position;
  /** The consumer's callback. A port calls it after a valid drop. */
  emitConnect(c: Connection): void;
}

/** Node context. A port needs exactly one thing: which node it lives in. */
export interface NodeContext {
  id: string;
}

export const BOARD_CONTEXT_KEY = Symbol('flowrap-board');
export const NODE_CONTEXT_KEY = Symbol('flowrap-node');
