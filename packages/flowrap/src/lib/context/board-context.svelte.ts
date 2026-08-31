import { getContext, setContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { flowToScreen, screenToFlow } from '../core/coordinates';
import { BOARD_CONTEXT_KEY } from '../types';
import type {
  BoardContext,
  Connection,
  ConnectionState,
  EdgeRecord,
  HandleRecord,
  NodeRecord,
  Position,
  Viewport
} from '../types';

/**
 * What the board hands down to the context: connection policy, the DOM
 * hit test, and the consumer's callback. All optional — the context unit
 * tests and a board without connectors get by on the defaults.
 */
export interface BoardContextOptions {
  canConnect?: (c: Connection) => boolean;
  hitTest?: (clientX: number, clientY: number) => ConnectionState['target'];
  clientToFlow?: (p: Position) => Position;
  onConnect?: (c: Connection) => void;
}

/**
 * The board's registries plus coordinate conversion.
 *
 * `nodes` is a SvelteMap, not `$state(new Map())`: `$state` proxies plain
 * objects and arrays but not collections, so `.set()` on a plain Map
 * isn't reactive and `bind:positions` would quietly stop updating (see
 * types.ts).
 *
 * Records are never mutated in place — they're replaced wholesale via
 * `.set()`. SvelteMap is reactive per key, while the records themselves
 * are plain objects: poking their fields would wake nobody.
 */
export function createBoardContext(
  getViewport: () => Viewport,
  options: BoardContextOptions = {}
): BoardContext {
  const nodes = new SvelteMap<string, NodeRecord>();
  const edges = new SvelteMap<string, EdgeRecord>();
  const handles = new SvelteMap<string, HandleRecord>();

  // A single value that gets replaced wholesale — no SvelteMap needed.
  let connection = $state<ConnectionState | null>(null);

  const handleKey = (nodeId: string, handleId: string) => `${nodeId}:${handleId}`;

  function canConnect(c: Connection): boolean {
    return options.canConnect?.(c) ?? true;
  }

  return {
    nodes,
    edges,
    handles,

    registerNode(id: string, initial: Position) {
      nodes.set(id, { id, x: initial.x, y: initial.y, w: 0, h: 0, el: null, rev: 0 });
    },

    unregisterNode(id: string) {
      nodes.delete(id);
    },

    /** node → board. Leaves rev alone. */
    updateNode(id: string, pos: Position) {
      const rec = nodes.get(id);
      if (!rec) return;
      if (rec.x === pos.x && rec.y === pos.y) return;
      nodes.set(id, { ...rec, x: pos.x, y: pos.y });
    },

    setNodeEl(id: string, el: HTMLElement) {
      const rec = nodes.get(id);
      if (!rec || rec.el === el) return;
      nodes.set(id, { ...rec, el });
    },

    /**
     * World size from offsetWidth/offsetHeight. Bailing out on an
     * unchanged size isn't an optimisation, it's correctness:
     * ResizeObserver also fires for changes that leave the numbers alone,
     * and without the check every callback would rebuild the edge layer.
     */
    setNodeSize(id: string, w: number, h: number) {
      const rec = nodes.get(id);
      if (!rec || (rec.w === w && rec.h === h)) return;
      nodes.set(id, { ...rec, w, h });
    },

    registerEdge(key: string, edge: EdgeRecord) {
      edges.set(key, edge);
    },

    /**
     * Bail out on an unchanged record: FlowEdge calls updateEdge from an
     * effect, and `edges` is read by the board's template.
     */
    updateEdge(key: string, edge: EdgeRecord) {
      const rec = edges.get(key);
      if (
        rec &&
        rec.from === edge.from &&
        rec.to === edge.to &&
        rec.type === edge.type &&
        rec.fromHandle === edge.fromHandle &&
        rec.toHandle === edge.toHandle
      ) {
        return;
      }
      edges.set(key, edge);
    },

    unregisterEdge(key: string) {
      edges.delete(key);
    },

    registerHandle(rec: HandleRecord) {
      handles.set(handleKey(rec.nodeId, rec.handleId), rec);
    },

    /**
     * Bail out on unchanged geometry, same reason as setNodeSize: the
     * measurement comes from a ResizeObserver, and that fires for changes
     * that leave the numbers alone.
     */
    setHandleGeometry(
      nodeId: string,
      handleId: string,
      x: number,
      y: number,
      w: number,
      h: number
    ) {
      const key = handleKey(nodeId, handleId);
      const rec = handles.get(key);
      if (!rec) return;
      if (rec.x === x && rec.y === y && rec.w === w && rec.h === h) return;
      handles.set(key, { ...rec, x, y, w, h });
    },

    unregisterHandle(nodeId: string, handleId: string) {
      handles.delete(handleKey(nodeId, handleId));
    },

    get connection() {
      return connection;
    },

    startConnection(from: string, fromHandle: string | undefined, cursor: Position) {
      connection = { from, fromHandle, cursor, target: null };
    },

    /**
     * The target is stored ONLY if connecting to it would pass
     * canConnect: ConnectionState.target means "valid target under the
     * cursor", and highlighting will be built on that same field.
     */
    moveConnection(cursor: Position, target: ConnectionState['target']) {
      if (!connection) return;
      const valid =
        target &&
        canConnect({
          from: connection.from,
          to: target.node,
          fromHandle: connection.fromHandle,
          toHandle: target.handle
        });
      connection = { ...connection, cursor, target: valid ? target : null };
    },

    endConnection(): Connection | null {
      const c = connection;
      // Cleared ALWAYS, before any checks — otherwise a rejected drop
      // leaves the preview line hanging around.
      connection = null;
      if (!c || !c.target) return null;
      const out: Connection = {
        from: c.from,
        to: c.target.node,
        fromHandle: c.fromHandle,
        toHandle: c.target.handle
      };
      return canConnect(out) ? out : null;
    },

    canConnect,

    hitTest(clientX: number, clientY: number) {
      return options.hitTest?.(clientX, clientY) ?? null;
    },

    clientToFlow(p: Position) {
      // With no board around, treat client coordinates as local ones:
      // the context unit tests have no viewport rectangle to offset by.
      return options.clientToFlow?.(p) ?? screenToFlow(p, getViewport());
    },

    emitConnect(c: Connection) {
      options.onConnect?.(c);
    },

    /**
     * board → node. Bumps rev ONLY for records whose value actually
     * changed: an unconditional rev++ would close the node → board →
     * node loop.
     */
    applyPositions(positions: Record<string, Position>) {
      for (const [id, pos] of Object.entries(positions)) {
        const rec = nodes.get(id);
        if (!rec) continue; // the node may not be mounted yet
        if (rec.x === pos.x && rec.y === pos.y) continue;
        nodes.set(id, { ...rec, x: pos.x, y: pos.y, rev: rec.rev + 1 });
      }
    },

    getViewport,

    screenToFlow(p: Position) {
      return screenToFlow(p, getViewport());
    },

    flowToScreen(p: Position) {
      return flowToScreen(p, getViewport());
    }
  };
}

export function setBoardContext(ctx: BoardContext): void {
  setContext(BOARD_CONTEXT_KEY, ctx);
}

export function getBoardContext(): BoardContext {
  const ctx = getContext<BoardContext | undefined>(BOARD_CONTEXT_KEY);
  if (!ctx) {
    throw new Error('[flowrap] <FlowNode> must be rendered inside <FlowBoard>');
  }
  return ctx;
}
