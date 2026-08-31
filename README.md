<p align="center">
  <img src="https://raw.githubusercontent.com/DenjiTensAI/flowrap/main/docs/brand/social-card.png" alt="flowrap — a pipeline board built with flowrap: draggable cards, ports and links" width="100%">
</p>

<h1 align="center">flowrap</h1>

<p align="center">
  A wrapper-first flow board for Svelte 5.<br>
  Wrap the component you already have — get drag, zoom, pan, ports and links.
</p>

<p align="center">
  <a href="https://denjitensai.github.io/flowrap/"><b>Live Storybook →</b></a>
</p>

---

flowrap is **headless when it comes to CSS**. It ships the behaviour — pointer
math, world coordinates, a registry, an SVG layer — and leaves every visual
decision to you. There is no theme to override, no `nodeTypes` to register, no
design system to fight. A node is whatever markup you put inside it, and it
looks exactly the way you style it.

- **Wrapper-first.** `<FlowNode>` gives your existing component a position and a
  drag handle. You don't describe your data to the library first.
- **You own the graph.** flowrap keeps no source of truth to sync against. Your
  array of links *is* the graph; a drag just calls `onconnect` and tells you
  about it.
- **Headless CSS.** Six class hooks and a handful of CSS variables. Everything
  else — cards, colours, shadows, grid — is your stylesheet.
- **Small on purpose.** Four components, two helpers, **zero runtime
  dependencies**. Svelte 5 is the only peer.

> 🇷🇺 **Документация на русском** — [docs/README.ru.md](docs/README.ru.md)

## Contents

- [Quick start](#quick-start)
- [Your data](#your-data)
- [API](#api)
  - [`<FlowBoard>`](#flowboard)
  - [`<FlowNode>`](#flownode)
  - [`<FlowEdge>`](#flowedge)
  - [`<FlowHandle>`](#flowhandle)
  - [Coordinate helpers](#coordinate-helpers)
- [Styling](#styling)
- [Positions: controlled, uncontrolled and snapshots](#positions-controlled-uncontrolled-and-snapshots)
- [Validating connections](#validating-connections)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Quick start

```bash
pnpm add flowrap
```

<details>
<summary>npm / yarn / bun</summary>

```bash
npm  i flowrap
yarn add flowrap
bun  add flowrap
```

</details>

`svelte@^5` is a peer dependency. There is no CSS file to import — the core
styles live in the components' own `<style>` blocks.

```svelte
<script>
  import { FlowBoard, FlowNode } from 'flowrap';
  import MyCard from './MyCard.svelte';
</script>

<div style="height: 70vh">
  <FlowBoard>
    <FlowNode id="a" x={40} y={40}>
      <MyCard title="Anything you already have" />
    </FlowNode>

    <FlowNode id="b" x={320} y={200}>
      <button>Even a plain button</button>
    </FlowNode>
  </FlowBoard>
</div>
```

Drag a card to move it, drag the background to pan, use the wheel to zoom
towards the cursor. That's the whole setup.

> [!IMPORTANT]
> **The element around `<FlowBoard>` must have a height.** The board is
> `height: 100%`, so the size comes from you. Without it the board collapses to
> zero and looks broken — no cards, no dragging. It's the one thing worth
> checking first.
>
> ```svelte
> <div><FlowBoard>…</FlowBoard></div>                       <!-- collapsed -->
> <div style="height: 70vh"><FlowBoard>…</FlowBoard></div>  <!-- correct -->
> ```

## Your data

flowrap never asks you to shape your data a particular way. Keep the array you
would have written anyway, and render it — the library only needs an `id` per
node and a `from`/`to` per link.

```ts
import type { Connection } from 'flowrap';

// Your nodes: id is the only field flowrap reads. The rest is yours.
const nodes = [
  { id: 'ingest',   x: 40,  y: 180, title: 'Webhook',   subtitle: 'POST /api/orders' },
  { id: 'queue',    x: 250, y: 180, title: 'Queue',     subtitle: 'Redis Streams' },
  { id: 'parse',    x: 465, y: 50,  title: 'Parse',     subtitle: 'JSON → Order' },
  { id: 'store',    x: 905, y: 150, title: 'Warehouse', subtitle: 'Postgres · orders' }
];

// Your links: from/to reference node ids, the handles are optional.
// A link is exactly what onconnect hands you, plus an id of your own.
type Link = Connection & { id: string };

let links = $state<Link[]>([
  { id: 'l1', from: 'ingest', to: 'queue', fromHandle: 'out', toHandle: 'in' },
  { id: 'l2', from: 'queue',  to: 'parse', fromHandle: 'out', toHandle: 'in' }
]);
```

Render them with two `{#each}` blocks and you have a working board:

```svelte
<div style="height: 70vh">
  <FlowBoard onconnect={(c) => (links = [...links, { id: crypto.randomUUID(), ...c }])}>
    {#each nodes as node (node.id)}
      <FlowNode id={node.id} x={node.x} y={node.y}>
        <div class="card">
          <FlowHandle id="in" type="target" />
          <strong>{node.title}</strong>
          <p>{node.subtitle}</p>
          <FlowHandle id="out" type="source" />
        </div>
      </FlowNode>
    {/each}

    {#each links as link (link.id)}
      <FlowEdge from={link.from} to={link.to}
                fromHandle={link.fromHandle} toHandle={link.toHandle} />
    {/each}
  </FlowBoard>
</div>
```

Because the array is yours, changing the graph is ordinary Svelte:

```ts
const addLink    = (c: Connection) => (links = [...links, { id: crypto.randomUUID(), ...c }]);
const removeLink = (id: string)    => (links = links.filter((l) => l.id !== id));
```

## API

Everything the package exports:

```ts
import {
  FlowBoard,    // the board: zoom, pan, the SVG layer for links
  FlowNode,     // wrapper: gives your markup a position and a drag
  FlowEdge,     // a link between two nodes
  FlowHandle,   // a port you drag links from
  screenToFlow, // screen → world
  flowToScreen  // world → screen
} from 'flowrap';

import type {
  Position,     // { x: number; y: number }
  Viewport,     // { pan: Position; zoom: number }
  Connection,   // { from, to, fromHandle?, toHandle? } — what onconnect hands you
  EdgePathType, // 'straight' | 'bezier' | 'step'
  HandleType    // 'source' | 'target' | 'both'
} from 'flowrap';
```

### `<FlowBoard>`

The viewport. Holds the world transform, draws the link layer, and reports
finished drags.

```svelte
<div style="height: 70vh">
  <FlowBoard
    bind:zoom
    bind:pan
    minZoom={0.35}
    maxZoom={2.5}
    onconnect={(c) => (links = [...links, { id: crypto.randomUUID(), ...c }])}
  >
    <!-- nodes and edges go here -->
  </FlowBoard>
</div>
```

| Prop | Type | Default | |
|---|---|---|---|
| `zoom` | `number` | `1` | `$bindable` |
| `pan` | `Position` | `{ x: 0, y: 0 }` | `$bindable` |
| `positions` | `Record<string, Position>` | `{}` | `$bindable`, a snapshot of every node |
| `minZoom` | `number` | `0.1` | |
| `maxZoom` | `number` | `4` | |
| `zoomSpeed` | `number` | `0.002` | `zoom * Math.exp(-deltaY * zoomSpeed)` |
| `onconnect` | `(c: Connection) => void` | — | a drag ended on a valid drop |
| `isValidConnection` | `(c: Connection) => boolean` | — | your own connection policy |
| `children` | `Snippet` | — | nodes, edges, and anything else you want in the world |

Dragging the background pans the board; the wheel zooms towards the cursor. A
drag that starts on a node or a port never pans.

Anything you put inside the board lives in **world space** — it pans and scales
along with the nodes. That's how the dotted grid in the screenshot is done: a
plain `<div>` with a `radial-gradient`, tucked under the links with `z-index`.

### `<FlowNode>`

The wrapper. Gives whatever is inside it a position and a drag gesture.

```svelte
<FlowNode id="queue" x={250} y={180}>
  <MyCard title="Queue" />
</FlowNode>
```

| Prop | Type | Default | |
|---|---|---|---|
| `id` | `string` | — | required, unique on the board |
| `x` | `number` | `0` | `$bindable` |
| `y` | `number` | `0` | `$bindable` |
| `disabled` | `boolean` | `false` | freezes the node in place |
| `children` | `Snippet` | — | your markup |

The wrapper carries a `data-fr-node={id}` attribute, which is a convenient
target for both styles and tests.

### `<FlowEdge>`

A link between two nodes. It renders nothing itself — it registers with the
board, and one shared SVG layer draws every line beneath the nodes.

```svelte
<FlowEdge from="queue" to="parse" fromHandle="out" toHandle="in" type="bezier" />
```

| Prop | Type | Default | |
|---|---|---|---|
| `from` | `string` | — | source node id |
| `to` | `string` | — | target node id |
| `type` | `'bezier' \| 'straight' \| 'step'` | `'bezier'` | line shape |
| `fromHandle` | `string` | — | port id on the `from` end |
| `toHandle` | `string` | — | port id on the `to` end |
| `id` | `string` | auto | registry key; only needed to address the edge from outside |

With handles the line ends on the port's centre; without them it ends on the
node's border. Stroke width stays constant while you zoom.

### `<FlowHandle>`

A port. Drag from one to another to create a link.

```svelte
<FlowNode id="queue" x={250} y={180}>
  <div class="card">
    <FlowHandle id="in"  type="target" class="port left" />
    <strong>Queue</strong>
    <FlowHandle id="out" type="source" class="port right" />
  </div>
</FlowNode>
```

| Prop | Type | Default | |
|---|---|---|---|
| `id` | `string` | — | required, unique **within its node** |
| `type` | `'source' \| 'target' \| 'both'` | `'both'` | direction |
| `children` | `Snippet` | — | your own markup inside the dot |
| `...rest` | — | — | `class`, `aria-*`, `data-*` … land on the port element |

Declare it **inside the node's content** — it finds its node through context, so
there is no `node="queue"` prop to repeat. Where the port ends up is decided by
your CSS, not by a schema: give the card `position: relative` and place the dots
wherever they belong.

A drag ends by calling `onconnect` on the board with
`{ from, to, fromHandle, toHandle }`. Dropping on empty space, pressing
<kbd>Esc</kbd>, or a cancelled gesture end the drag quietly.

### Coordinate helpers

```ts
import { screenToFlow, flowToScreen } from 'flowrap';

screenToFlow({ x, y }, { pan, zoom }); // screen → world
flowToScreen({ x, y }, { pan, zoom }); // world → screen
```

Both work in coordinates **local to the board** (its top-left corner is
`{0, 0}`), not page coordinates. Convert from a pointer event yourself:

```ts
const rect = boardEl.getBoundingClientRect();
const world = screenToFlow({ x: e.clientX - rect.left, y: e.clientY - rect.top }, { pan, zoom });
```

## Styling

flowrap styles nothing you can see except the port dot and the link stroke — and
both are variables. Everything else is your markup and your CSS.

**Six class hooks, plus the node wrapper's data attribute:**

| Selector | What it is |
|---|---|
| `.fr-viewport` | the board's clipping box |
| `.fr-world` | the panned and scaled layer |
| `.fr-edges` | the SVG layer holding every link |
| `.fr-edge` | one link's `<path>` |
| `.fr-connection` | the preview line drawn while dragging a new link |
| `.fr-handle` | a port dot |
| `[data-fr-node]` | a node wrapper |

**All the variables:**

```css
.my-board {
  /* links */
  --fr-edge-stroke: #94a3b8;
  --fr-edge-width: 1.75;

  /* ports */
  --fr-handle-size: 11px;
  --fr-handle-bg: #fff;
  --fr-handle-border: #666;

  /* the preview line while you drag */
  --fr-connection-stroke: #2563eb;
  --fr-connection-width: 2;
  --fr-connection-dash: 5 5;
}
```

Because they are plain custom properties, theming is plain CSS — the board in
the screenshot switches to dark by redefining them on a wrapper:

```css
.stage[data-theme='dark'] {
  --fr-edge-stroke: #475569;
  --fr-connection-stroke: #60a5fa;
  --fr-handle-bg: #0f172a;
}
```

**Placing ports.** The card is the positioning context; the ports are absolute
against it. Ports come from another component, so reach them with `:global`:

```svelte
<FlowNode id="queue">
  <div class="card">
    <FlowHandle id="in"  type="target" class="left" />
    <strong>Queue</strong>
    <FlowHandle id="out" type="source" class="right" />
  </div>
</FlowNode>

<style>
  .card {
    /* ports position themselves against the card */
    position: relative;
    width: 178px;
    padding: 10px 12px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-left: 3px solid var(--accent, #2563eb);
    border-radius: 10px;
    box-shadow: 0 8px 20px -12px rgb(15 23 42 / 0.35);
    cursor: grab;
  }

  .card:active { cursor: grabbing; }

  .card :global(.fr-handle) {
    position: absolute;
    top: 50%;
    margin-top: -6px;
    border: 2px solid var(--accent, #2563eb);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #2563eb) 18%, transparent);
    transition: transform 0.12s;
  }

  .card :global(.fr-handle.left)  { left: -7px; }
  .card :global(.fr-handle.right) { right: -7px; }
  .card :global(.fr-handle:hover) { transform: scale(1.35); }
</style>
```

That snippet is lifted from the board in the screenshot — the full version lives
in [`storybook/src/stories/showcase/PipelineBoard.svelte`](storybook/src/stories/showcase/PipelineBoard.svelte).

## Positions: controlled, uncontrolled and snapshots

There is no mode flag. Whether a node owns its position or you do is decided by
`bind:`.

```svelte
<!-- uncontrolled: the node keeps its position, x/y are starting values -->
<FlowNode id="a" x={40} y={40}>…</FlowNode>

<!-- controlled: the position lives in your state -->
<FlowNode id="a" bind:x bind:y>…</FlowNode>
```

For the whole board at once, `bind:positions` is a two-way
`Record<id, {x, y}>` — handy for saving and restoring a layout:

```svelte
<script>
  let positions = $state({});

  const save = () => localStorage.setItem('layout', JSON.stringify(positions));
  const load = () => {
    const raw = localStorage.getItem('layout');
    if (raw) positions = JSON.parse(raw); // the nodes actually move
  };
</script>

<FlowBoard bind:positions>…</FlowBoard>
```

It works both ways: dragging a node updates `positions`, and assigning to
`positions` moves the nodes. While a node is being dragged it ignores incoming
assignments, so a load in the middle of a gesture won't yank the card out from
under the cursor. `bind:x`/`bind:y` and `bind:positions` can be used together.

## Validating connections

Before `onconnect` fires, a candidate link passes three checks in order:

1. **no self-connect** — `from === to` is rejected;
2. **port directions must fit** — `source` → `target`, and `both` fits either;
3. **your `isValidConnection`** — the application-specific part, called last.

Rules that depend on your data belong in step 3, because the library has never
seen your links:

```svelte
<FlowBoard
  isValidConnection={(c) => !links.some((l) => l.from === c.from && l.to === c.to)}
  onconnect={(c) => (links = [...links, { id: crypto.randomUUID(), ...c }])}
/>
```

If any check fails, the preview line disappears and `onconnect` is not called.

## Examples

**[Live Storybook](https://denjitensai.github.io/flowrap/)** — every story
in the browser, nothing to install.

To run the same scenarios locally:

```bash
pnpm storybook                    # component gallery, includes the board above
pnpm --filter playground dev      # SvelteKit app used for manual QA and e2e
```

The Storybook **Showcase** story is the board from the screenshot: dragging,
zooming, live linking, layout save/restore and theme switching, all in one
file you can read end to end.

Writing code with an AI assistant? The package ships `llms.txt` — the whole API
and a set of recipes in a single self-contained file, available as
`node_modules/flowrap/llms.txt` after install.

## Contributing

Pull requests are welcome. Everything you need — environment, commands, project
layout, testing and the architectural invariants the tests rely on — is in
**[CONTRIBUTING.md](CONTRIBUTING.md)**.

If you work on the codebase with an AI agent, point it at
**[AGENTS.md](AGENTS.md)** first: it carries the measurements, the disproven
hypotheses and the traps that already cost time.

## License

[MIT](LICENSE) © Denis Movsumov
