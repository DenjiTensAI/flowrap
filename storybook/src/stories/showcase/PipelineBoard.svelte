<script lang="ts">
  import { FlowBoard, FlowEdge, FlowHandle, FlowNode, screenToFlow } from 'flowrap';
  import type { Connection, EdgePathType, Position } from 'flowrap';
  import {
    hasIn,
    hasOut,
    pipelineLinks,
    pipelineNodes,
    type PipelineLink
  } from './pipeline-data';

  let { theme = 'light' }: { theme?: 'light' | 'dark' } = $props();

  const MIN_ZOOM = 0.35;
  const MAX_ZOOM = 2.5;
  const START = { zoom: 0.9, pan: { x: 16, y: 4 } };

  // The whole graph is THIS DEMO's state, not the library's: flowrap keeps
  // no source of truth you'd have to sync against.
  let links = $state<PipelineLink[]>([...pipelineLinks]);

  let zoom = $state(START.zoom);
  let pan = $state({ ...START.pan });
  let positions = $state<Record<string, Position>>({});
  let savedLayout = $state<Record<string, Position> | null>(null);

  let edgeType = $state<EdgePathType>('bezier');
  let frozen = $state(false);
  let noDuplicates = $state(true);

  let hostEl = $state<HTMLElement | null>(null);
  let cursor = $state<Position | null>(null);
  let lastEvent = $state('ready');

  const clampZoom = (v: number) => Math.min(Math.max(v, MIN_ZOOM), MAX_ZOOM);

  function resetView() {
    zoom = START.zoom;
    pan = { ...START.pan };
    lastEvent = 'view reset';
  }

  // bind:positions, board → consumer direction.
  function saveLayout() {
    savedLayout = { ...positions };
    lastEvent = `layout saved (${Object.keys(savedLayout).length} nodes)`;
  }

  // …and back: assigning to positions moves the nodes on the board.
  function restoreLayout() {
    if (!savedLayout) return;
    positions = { ...savedLayout };
    lastEvent = 'layout restored';
  }

  function resetLayout() {
    positions = Object.fromEntries(pipelineNodes.map((n) => [n.id, { x: n.x, y: n.y }]));
    lastEvent = 'layout reset';
  }

  /**
   * Our connection policy. The library rejects self-connects and
   * mismatched port directions on its own; "that link already exists" is
   * something it cannot know — it has never seen this demo's edges.
   */
  function isValidConnection(c: Connection): boolean {
    if (!noDuplicates) return true;
    return !links.some((l) => l.from === c.from && l.to === c.to);
  }

  /** The demo creates the edge, not the library: onconnect just tells us. */
  function onconnect(c: Connection) {
    links = [...links, { id: crypto.randomUUID(), ...c }];
    lastEvent = `linked ${c.from} → ${c.to}`;
  }

  function removeLast() {
    if (links.length === 0) return;
    const gone = links[links.length - 1]!;
    links = links.slice(0, -1);
    lastEvent = `removed ${gone.from} → ${gone.to}`;
  }

  function restoreLinks() {
    links = [...pipelineLinks];
    lastEvent = 'links restored';
  }

  // The public screenToFlow helper: screen → world. It works in
  // board-local coordinates, so subtract the board's rectangle first.
  function trackCursor(e: PointerEvent) {
    if (!hostEl) return;
    const r = hostEl.getBoundingClientRect();
    cursor = screenToFlow({ x: e.clientX - r.left, y: e.clientY - r.top }, { pan, zoom });
  }

  const round = (v: number) => Math.round(v);
</script>

<div class="stage" data-theme={theme}>
  <div class="toolbar">
    <div class="group">
      <button onclick={() => (zoom = clampZoom(zoom / 1.2))} title="Zoom out">−</button>
      <span class="value">{Math.round(zoom * 100)}%</span>
      <button onclick={() => (zoom = clampZoom(zoom * 1.2))} title="Zoom in">+</button>
      <button onclick={resetView}>Reset view</button>
    </div>

    <div class="group">
      <span class="label">Lines</span>
      {#each ['bezier', 'straight', 'step'] as const as t (t)}
        <button class:active={edgeType === t} onclick={() => (edgeType = t)}>{t}</button>
      {/each}
    </div>

    <div class="group">
      <span class="label">Layout</span>
      <button onclick={saveLayout}>Save</button>
      <button disabled={!savedLayout} onclick={restoreLayout}>Restore</button>
      <button onclick={resetLayout}>Reset</button>
    </div>

    <div class="group">
      <span class="label">Links · {links.length}</span>
      <button disabled={links.length === 0} onclick={removeLast}>Remove link</button>
      <button onclick={restoreLinks}>Original set</button>
    </div>

    <label class="toggle">
      <input type="checkbox" bind:checked={noDuplicates} /> no duplicates
    </label>
    <label class="toggle">
      <input type="checkbox" bind:checked={frozen} /> freeze nodes
    </label>
  </div>

  <p class="hint">
    Drag from a card's <em>right</em> port to another card's <em>left</em> port and the link
    shows up in this demo's own list. Cancel with <kbd>Esc</kbd> or a drop on empty space.
    Nodes move with the mouse, the background pans, the wheel zooms to the cursor.
  </p>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="canvas" bind:this={hostEl} onpointermove={trackCursor}>
    <FlowBoard
      bind:zoom
      bind:pan
      bind:positions
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      {isValidConnection}
      {onconnect}
    >
      <!-- The grid lives INSIDE the world, so it pans and scales along
           with it; z-index tucks it under the edge layer. -->
      <div class="grid"></div>

      {#each pipelineNodes as n (n.id)}
        <FlowNode id={n.id} x={n.x} y={n.y} disabled={frozen}>
          <div class="pnode k-{n.kind}" class:frozen>
            {#if hasIn(n.kind)}
              <FlowHandle id="in" type="target" class="port left" />
            {/if}

            <header>
              <span class="icon">{n.icon}</span>
              <span class="title">{n.title}</span>
            </header>
            <p class="sub">{n.subtitle}</p>
            <footer>
              <span class="dot {n.status}"></span>
              <span class="metric">{n.metric}</span>
            </footer>

            {#if hasOut(n.kind)}
              <FlowHandle id="out" type="source" class="port right" />
            {/if}
          </div>
        </FlowNode>
      {/each}

      {#each links as link (link.id)}
        <FlowEdge
          from={link.from}
          to={link.to}
          fromHandle={link.fromHandle}
          toHandle={link.toHandle}
          type={edgeType}
        />
      {/each}
    </FlowBoard>
  </div>

  <div class="status">
    <span>zoom <b>{zoom.toFixed(2)}</b></span>
    <span>pan <b>{round(pan.x)}, {round(pan.y)}</b></span>
    <span>
      cursor in world
      <b>{cursor ? `${round(cursor.x)}, ${round(cursor.y)}` : '—'}</b>
    </span>
    <span class="spacer"></span>
    <span class="event">{lastEvent}</span>
  </div>
</div>

<style>
  /*
   * The theme is plain CSS variables on the wrapper. Some of them are read
   * by the library itself (--fr-edge-*, --fr-handle-*, --fr-connection-*):
   * it has no other styling API, and doesn't need one.
   */
  .stage {
    --bg: #f1f5f9;
    --grid-dot: #cbd5e1;
    --panel: #ffffff;
    --line: #e2e8f0;
    --ink: #0f172a;
    --muted: #64748b;
    --card: #ffffff;
    --card-line: #e2e8f0;
    --shadow: 0 1px 2px rgb(15 23 42 / 0.06), 0 8px 20px -12px rgb(15 23 42 / 0.35);

    --fr-edge-stroke: #94a3b8;
    --fr-edge-width: 1.75;
    --fr-connection-stroke: #2563eb;
    --fr-connection-width: 2;
    --fr-connection-dash: 5 5;
    --fr-handle-size: 11px;
    --fr-handle-bg: #ffffff;

    display: flex;
    flex-direction: column;
    height: 100vh;
    color: var(--ink);
    background: var(--panel);
    font: 13px/1.45 ui-sans-serif, system-ui, sans-serif;
  }

  .stage[data-theme='dark'] {
    --bg: #0b1120;
    --grid-dot: #1e293b;
    --panel: #0f172a;
    --line: #1e293b;
    --ink: #e2e8f0;
    --muted: #94a3b8;
    --card: #111c33;
    --card-line: #24324b;
    --shadow: 0 1px 2px rgb(0 0 0 / 0.4), 0 10px 24px -14px rgb(0 0 0 / 0.9);

    --fr-edge-stroke: #475569;
    --fr-connection-stroke: #60a5fa;
    --fr-handle-bg: #0f172a;
  }

  /* --- toolbar --- */

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    align-items: center;
    padding: 10px 14px;
    border-bottom: 1px solid var(--line);
    background: var(--panel);
  }

  .group {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .label,
  .value {
    color: var(--muted);
    font-size: 12px;
  }

  .value {
    min-width: 42px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  button {
    padding: 4px 10px;
    color: var(--ink);
    font: inherit;
    font-size: 12px;
    background: var(--card);
    border: 1px solid var(--card-line);
    border-radius: 6px;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    border-color: #2563eb;
  }

  button:disabled {
    opacity: 0.45;
    cursor: default;
  }

  button.active {
    color: #fff;
    background: #2563eb;
    border-color: #2563eb;
  }

  .toggle {
    display: flex;
    gap: 5px;
    align-items: center;
    color: var(--muted);
    font-size: 12px;
    cursor: pointer;
  }

  .hint {
    margin: 0;
    padding: 8px 14px;
    color: var(--muted);
    font-size: 12px;
    background: var(--bg);
    border-bottom: 1px solid var(--line);
  }

  .hint em {
    color: var(--ink);
    font-style: normal;
    font-weight: 600;
  }

  kbd {
    padding: 1px 5px;
    font-family: ui-monospace, monospace;
    font-size: 11px;
    background: var(--card);
    border: 1px solid var(--card-line);
    border-radius: 4px;
  }

  /* --- board --- */

  .canvas {
    flex: 1;
    min-height: 0;
    background: var(--bg);
  }

  .grid {
    position: absolute;
    top: -2000px;
    left: -2000px;
    z-index: -1;
    width: 6000px;
    height: 6000px;
    background-image: radial-gradient(var(--grid-dot) 1px, transparent 1px);
    background-size: 24px 24px;
    /* the background is what you pan by — the grid must not catch the pointer */
    pointer-events: none;
  }

  /* --- node card --- */

  .pnode {
    /* ports are positioned against the card: it becomes their
       offsetParent, and flowrap walks the chain up to the node wrapper */
    position: relative;
    box-sizing: border-box;
    width: 178px;
    padding: 10px 12px;
    background: var(--card);
    border: 1px solid var(--card-line);
    border-left: 3px solid var(--accent, #94a3b8);
    border-radius: 10px;
    box-shadow: var(--shadow);
    cursor: grab;
    transition: box-shadow 0.15s, transform 0.15s;
  }

  .pnode:hover {
    box-shadow: 0 2px 4px rgb(15 23 42 / 0.08), 0 14px 28px -14px rgb(15 23 42 / 0.5);
  }

  .pnode:active {
    cursor: grabbing;
  }

  .pnode.frozen {
    cursor: default;
    opacity: 0.75;
  }

  .pnode.k-ingest {
    --accent: #2563eb;
  }
  .pnode.k-transform {
    --accent: #7c3aed;
  }
  .pnode.k-check {
    --accent: #d97706;
  }
  .pnode.k-sink {
    --accent: #059669;
  }
  .pnode.k-alert {
    --accent: #e11d48;
  }

  .pnode header {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .icon {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    color: var(--accent);
    font-size: 12px;
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    border-radius: 6px;
  }

  .title {
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .sub {
    margin: 6px 0 8px;
    color: var(--muted);
    font-family: ui-monospace, monospace;
    font-size: 11px;
  }

  .pnode footer {
    display: flex;
    gap: 6px;
    align-items: center;
    padding-top: 7px;
    border-top: 1px solid var(--card-line);
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  .dot.ok {
    background: #10b981;
  }
  .dot.warn {
    background: #f59e0b;
  }
  .dot.idle {
    background: #94a3b8;
  }

  .metric {
    color: var(--muted);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  /*
   * Ports belong to another component, hence :global. The library gives
   * them a size, a shape and a gesture; where they go is decided by these
   * four rules.
   */
  .pnode :global(.fr-handle) {
    position: absolute;
    top: 50%;
    margin-top: -6px;
    border: 2px solid var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
    transition: transform 0.12s;
  }

  .pnode :global(.fr-handle.left) {
    left: -7px;
  }

  .pnode :global(.fr-handle.right) {
    right: -7px;
  }

  .pnode :global(.fr-handle:hover) {
    transform: scale(1.35);
  }

  /* --- status bar --- */

  .status {
    display: flex;
    gap: 18px;
    align-items: center;
    padding: 7px 14px;
    color: var(--muted);
    font-family: ui-monospace, monospace;
    font-size: 11px;
    background: var(--panel);
    border-top: 1px solid var(--line);
  }

  .status b {
    color: var(--ink);
    font-weight: 600;
  }

  .spacer {
    flex: 1;
  }

  .event {
    color: var(--ink);
  }
</style>
