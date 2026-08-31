<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import { draggable } from '../actions/draggable';
  import { screenToFlow, zoomAtPoint } from '../core/coordinates';
  import { centerOf, edgePath } from '../core/edge-path';
  import {
    anchorFor,
    directionsCompatible,
    handleCenter,
    nearestHandle
  } from '../core/handle-geometry';
  import {
    createBoardContext,
    setBoardContext
  } from '../context/board-context.svelte';
  import type {
    Connection,
    ConnectionState,
    HandleRecord,
    HandleType,
    Position
  } from '../types';

  interface FlowBoardProps {
    zoom?: number;
    pan?: Position;
    /** Two-way snapshot of every node's position. */
    positions?: Record<string, Position>;
    minZoom?: number;
    maxZoom?: number;
    zoomSpeed?: number;
    /**
     * A drag ended on a valid drop. The library does NOT create the edge:
     * what to do with the connection is the consumer's call.
     */
    onconnect?: (c: Connection) => void;
    /**
     * Your own connection policy. Called last, after the self-connect and
     * direction checks.
     */
    isValidConnection?: (c: Connection) => boolean;
    children?: Snippet;
  }

  let {
    zoom = $bindable(1),
    pan = $bindable({ x: 0, y: 0 }),
    positions = $bindable({}),
    minZoom = 0.1,
    maxZoom = 4,
    zoomSpeed = 0.002,
    onconnect,
    isValidConnection,
    children
  }: FlowBoardProps = $props();

  let viewportEl = $state<HTMLElement | null>(null);

  /**
   * What you're dropping on. The one place where the core touches the DOM
   * directly: during a drag the pointer is captured by the port and every
   * event is retargeted to it, so e.target tells you nothing about
   * geometry — elementFromPoint ignores the capture and answers honestly.
   */
  function hitTest(clientX: number, clientY: number): ConnectionState['target'] {
    if (typeof document.elementFromPoint !== 'function') return null;
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const nodeEl = el.closest('[data-fr-node]');
    if (!nodeEl) return null; // dropped on empty space
    const node = nodeEl.getAttribute('data-fr-node')!;
    const from = activeFromType();

    const under = el.closest('[data-fr-handle]')?.getAttribute('data-fr-handle') ?? undefined;
    const underType = under ? ctx.handles.get(`${node}:${under}`)?.type : undefined;

    // Cursor is on a port that FITS — take it.
    if (under && directionsCompatible(from, underType)) return { node, handle: under };

    // Otherwise you aimed at the card — and it doesn't matter whether
    // you hit its body or a port pointing the wrong way: find the nearest
    // compatible port on the same node. Without this, landing exactly on
    // an incompatible dot rejected the whole drop, while a pixel to the
    // side it would have worked.
    return snapTarget(node, clientX, clientY, from);
  }

  /** Type of the port being dragged from. undefined = no drag going on. */
  function activeFromType(): HandleType | undefined {
    const c = ctx.connection;
    if (!c?.fromHandle) return undefined;
    return ctx.handles.get(`${c.from}:${c.fromHandle}`)?.type;
  }

  /**
   * Resolve the drop against the node under the cursor. No "magnet within
   * N pixels" here: only ports of the node the hit test already picked
   * are considered.
   *
   * The two flavours of "no port found" are kept apart on purpose:
   * — the node has NO ports at all ⇒ the link goes to the node's border;
   * — it has ports but none point the right way ⇒ there is no target.
   *   Returning `handle: undefined` here would be wrong: the rule "no
   *   port means compatible with anything" is about bare nodes, and via
   *   that loophole a drag from a `target` would land on any card.
   */
  function snapTarget(
    nodeId: string,
    clientX: number,
    clientY: number,
    fromType: HandleType | undefined
  ): ConnectionState['target'] {
    const rec = ctx.nodes.get(nodeId);
    if (!rec) return null;

    const own: HandleRecord[] = [];
    for (const h of ctx.handles.values()) if (h.nodeId === nodeId) own.push(h);
    if (own.length === 0) return { node: nodeId, handle: undefined };

    const cursor = clientToFlow({ x: clientX, y: clientY });
    const best = nearestHandle({ x: rec.x, y: rec.y }, own, cursor, fromType);
    return best ? { node: nodeId, handle: best.handleId } : null;
  }

  /** clientX/clientY → world. Only the board knows the viewport's rect. */
  function clientToFlow(p: Position): Position {
    const rect = viewportEl?.getBoundingClientRect();
    const local = rect ? { x: p.x - rect.left, y: p.y - rect.top } : p;
    return screenToFlow(local, { pan, zoom });
  }

  /** Three rules, one verdict. Your own policy gets the last word. */
  function canConnect(c: Connection): boolean {
    if (c.from === c.to) return false;
    const fromType = ctx.handles.get(`${c.from}:${c.fromHandle}`)?.type;
    const toType = ctx.handles.get(`${c.to}:${c.toHandle}`)?.type;
    if (!directionsCompatible(fromType, toType)) return false;
    return isValidConnection?.(c) ?? true;
  }

  const ctx = createBoardContext(() => ({ pan, zoom }), {
    canConnect,
    hitTest,
    clientToFlow,
    onConnect: (c) => onconnect?.(c)
  });
  setBoardContext(ctx);

  function clamp(v: number, min: number, max: number) {
    return Math.min(Math.max(v, min), max);
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    if (!viewportEl) return;

    // Cursor in coordinates local to .fr-viewport: the pure functions in
    // core/coordinates know nothing about getBoundingClientRect.
    const rect = viewportEl.getBoundingClientRect();
    const cursor = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const next = clamp(zoom * Math.exp(-e.deltaY * zoomSpeed), minZoom, maxZoom);
    pan = zoomAtPoint(cursor, { pan, zoom }, next);
    zoom = next;
  }

  // Wired by hand rather than via onwheel: we need passive: false, or
  // preventDefault() silently does nothing.
  $effect(() => {
    const el = viewportEl;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const panParams = {
    // pointerdown on a node bubbles up to .fr-viewport; without this
    // filter, dragging a node would pan the board too.
    filter: (e: PointerEvent) =>
      !(e.target as HTMLElement | null)?.closest('[data-fr-node]'),
    onDrag(delta: Position) {
      // The pan delta stays in screen units — no dividing by zoom here.
      pan = { x: pan.x + delta.x, y: pan.y + delta.y };
    }
  };

  function samePositions(a: Record<string, Position>, b: Record<string, Position>) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) {
      const pa = a[k];
      const pb = b[k];
      if (!pb || pa!.x !== pb.x || pa!.y !== pb.y) return false;
    }
    return true;
  }

  // node → board. Every read of `positions` goes through untrack, the
  // comparison included: it's a $state proxy, and reading its fields
  // OUTSIDE untrack would subscribe the effect to what it writes itself
  // (effect_update_depth_exceeded).
  $effect(() => {
    const next: Record<string, Position> = {};
    for (const [id, rec] of ctx.nodes) next[id] = { x: rec.x, y: rec.y };

    if (untrack(() => !samePositions(next, positions))) positions = next;
  });

  // board → node. The registry is read through untrack, or every drag
  // step would snap the node back to the old position in `positions`.
  $effect(() => {
    const next = positions;
    untrack(() => ctx.applyPositions(next));
  });

  // Edge paths. $derived rather than $effect + $state: it's a derived
  // value read only by the template, so there's no state worth keeping.
  // Coordinates are in world units — the SVG layer lives inside
  // .fr-world, so the transform is applied to it for free.
  const edgeList = $derived.by(() => {
    const out: { key: string; d: string }[] = [];
    for (const [key, e] of ctx.edges) {
      const a = ctx.nodes.get(e.from);
      const b = ctx.nodes.get(e.to);
      if (!a || !b) continue; // unknown from/to — draw nothing, say nothing
      if (a.w === 0 || b.w === 0) continue; // not measured yet
      const ra = { x: a.x, y: a.y, w: a.w, h: a.h };
      const rb = { x: b.x, y: b.y, w: b.w, h: b.h };
      const ca = centerOf(ra);
      const cb = centerOf(rb);
      // With no handles, anchorFor falls through to clipToRect and gives
      // byte-for-byte the same path as a plain node-to-node edge.
      const ha = ctx.handles.get(`${e.from}:${e.fromHandle}`);
      const hb = ctx.handles.get(`${e.to}:${e.toHandle}`);
      out.push({
        key,
        d: edgePath(e.type, anchorFor(ra, ha, cb), anchorFor(rb, hb, ca))
      });
    }
    return out;
  });

  /**
   * The preview line. Its far end is the cursor rather than a node —
   * there may well be no target. The no-handle branch clips to the
   * rectangle exactly like a real edge, so the line leaves the node's
   * edge instead of its corner.
   */
  const previewPath = $derived.by(() => {
    const c = ctx.connection;
    if (!c) return null;
    const a = ctx.nodes.get(c.from);
    if (!a) return null;
    const ra = { x: a.x, y: a.y, w: a.w, h: a.h };
    const h = ctx.handles.get(`${c.from}:${c.fromHandle}`);
    // End at the target port's centre, not at the cursor: the line shows
    // up front where the link will land if you let go now.
    const end = targetPoint(c) ?? c.cursor;
    return edgePath('bezier', anchorFor(ra, h, end), end);
  });

  /** World centre of the port the link will land on, null if there's none. */
  function targetPoint(c: ConnectionState): Position | null {
    const t = c.target;
    if (!t?.handle) return null;
    const nb = ctx.nodes.get(t.node);
    const hb = ctx.handles.get(`${t.node}:${t.handle}`);
    if (!nb || !hb) return null;
    return handleCenter({ x: nb.x, y: nb.y }, hb);
  }

  // Escape cancels. The listener lives only for the duration of a drag
  // and sits on window: the port has no focus. Touch has no Escape at
  // all, which is why it isn't the only way out — see pointercancel.
  $effect(() => {
    if (!ctx.connection) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // The result is dropped on purpose: endConnection always clears
      // the state, and a cancelled drag creates nothing.
      if (e.key === 'Escape') ctx.endConnection();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });
</script>

<div class="fr-viewport" bind:this={viewportEl} use:draggable={panParams}>
  <div
    class="fr-world"
    style="transform: translate({pan.x}px,{pan.y}px) scale({zoom})"
  >
    <!-- Edge layer BEFORE children: lines must sit under the nodes. -->
    <svg class="fr-edges">
      {#each edgeList as e (e.key)}
        <!-- non-scaling-stroke: at minZoom=0.1 a scaled stroke thins out
             into nothing -->
        <path class="fr-edge" d={e.d} vector-effect="non-scaling-stroke" />
      {/each}

      <!-- Preview after the edges: on top of them, still under nodes. -->
      {#if previewPath}
        <path class="fr-connection" d={previewPath} vector-effect="non-scaling-stroke" />
      {/if}
    </svg>
    {@render children?.()}
  </div>
</div>

<style>
  .fr-viewport {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
    /* required, or the browser eats pointermove as scroll/zoom */
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  .fr-world {
    position: absolute;
    top: 0;
    left: 0;
    /* required: the zoom maths assumes a top-left origin */
    transform-origin: 0 0;
    width: 100%;
    height: 100%;
  }

  .fr-edges {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    /* required: nodes happily wander into negative world coordinates,
       and lines to them must not be clipped */
    overflow: visible;
    /* required, or edges swallow pointerdown and break panning */
    pointer-events: none;
  }

  .fr-edge {
    fill: none;
    stroke: var(--fr-edge-stroke, #999);
    stroke-width: var(--fr-edge-width, 1.5);
  }

  .fr-connection {
    fill: none;
    stroke: var(--fr-connection-stroke, #4a9eff);
    stroke-width: var(--fr-connection-width, 2);
    stroke-dasharray: var(--fr-connection-dash, 4 4);
    pointer-events: none;
  }
</style>
