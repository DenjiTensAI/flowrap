# AGENTS.md

Instructions for an agent **working on flowrap itself**. If you need to *use*
the library in someone else's project, this is the wrong file: read `README.md`
or `packages/flowrap/llms.txt`.

## What this project is

flowrap is a wrapper-first board for Svelte 5: zoom, pan, node dragging, edges,
and links you draw with the mouse. It's a pnpm monorepo with exactly one
published package — `packages/flowrap`.

**The principle almost everything else follows from: the library does not own
the graph.** It keeps no source of truth, and it neither creates nor deletes
edges. A drag ends by calling `onconnect` — what to do with the connection is
the consumer's decision. A node is a wrapper around someone else's markup, not
a "node type" registered somewhere.

A suggestion along the lines of "let's have the library store `edges[]`" is not
an improvement, it's an architecture change. Don't make it silently.

## Commands

```bash
pnpm install                  # node 24 + pnpm 11, see CONTRIBUTING.md
pnpm -r test                  # vitest, jsdom — the fast loop
pnpm -r check                 # svelte-check
pnpm -r lint                  # eslint
pnpm --filter flowrap build   # svelte-package + prune-dist
pnpm e2e                      # Playwright, Chromium
```

Definition of Done for any change: `test` + `check` + `lint` + `build` green,
e2e green when gestures or geometry changed, and a `pnpm changeset` for any
public API change.

**DX trap:** the playground and Storybook import `flowrap` as a package, i.e.
from `dist/`. An edit in `src/lib` is invisible until you rebuild. Keep
`pnpm --filter flowrap dev` (that's `svelte-package --watch`) in a second
terminal, or you'll lose time to "my changes aren't applying".

## Repository map

```
packages/flowrap/src/lib/
  core/          pure, DOM-free functions: coordinates, edge-path, handle-geometry
  actions/       draggable — the only place that touches pointer events
  context/       board-context (node/edge/handle registries), node-context
  components/    FlowBoard, FlowNode, FlowEdge, FlowHandle + *.harness.svelte
  index.ts       the public API — exactly 6 exports plus types
storybook/       the gallery; builds from dist, so it catches a broken API
playground/      SvelteKit, the e2e target; also builds from dist
e2e/             Playwright, deliberately NOT a workspace package
```

`*.harness.svelte` and `*.test.ts` exist only for the tests and are stripped
from the tarball by `scripts/prune-dist.js`.

## Before you change code

Read **`CONTRIBUTING.md` → "Architectural invariants"**. There are 20 of them,
each with a reason and a failure symptom, and each has tests resting on it.
These aren't style preferences: the `transform` string format, the SVG layer
order, `pointer-events: none` on the edges, `untrack` inside effects,
`offsetWidth` instead of `getBoundingClientRect` — every one of them breaks
quietly and takes a long time to diagnose.

Don't copy the invariants into this file. They would drift.

## Disproven hypotheses and dead ends

The most expensive part of this file: things that have **already been tried and
didn't hold**. Every hypothesis below sounds plausible and will come up again.

### `state_unsafe_mutation` in `FlowEdge` — hypothesis DISPROVEN

The plausible explanation — "`FlowEdge` registers in an `$effect` because
mutating someone else's `$state` from the `<script>` body throws
`state_unsafe_mutation`" — is **wrong**. The spike: registering the edge
directly in the script body does not throw, and `path.fr-edge` renders. The
reason is that `ctx.edges` is a `SvelteMap`, and its `.set()` from a child's
script body runs outside the parent's active `$derived`/`$effect` computation.

The real reason to use `$effect` is lifecycle: the return from the effect
unregisters without a separate `onDestroy`, and a second effect is needed for
`updateEdge` on prop changes anyway.

**The methodological part, which matters more than the finding itself:**
`state_unsafe_mutation` only exists in dev builds. Without a canary, "no error"
is indistinguishable from "the checks are off". The control has to be a
reference case — a `$state` mutation inside a `$derived`, in the same run, that
MUST throw. A weak control (mutating an array from a prop in a child's script
body) doesn't throw either and proves nothing. Run any spike about Svelte's dev
checks the same way.

### `effect_update_depth_exceeded`: `untrack` covering the wrong thing

The symptom is a crash on mount. The cause is always the same: **an effect
reads and writes the same source**. We stepped on it twice:

1. `setNodeEl` does `nodes.get(id)` and `nodes.set(id, …)` on one key — self
   invalidation. Fixed with `untrack` plus idempotency.
2. `if (!samePositions(next, untrack(() => positions)))` looks guarded, but
   `untrack` only covers reading the **reference**, while the `pb.x`/`pb.y`
   fields are read outside it — so the effect subscribes to the very object it
   assigns.

The rule: `untrack` must cover **the whole region where the tracked object's
fields are read**, not just the expression that returns the reference.

### Optimisations that are NOT needed (the premise failed a measurement)

- **Throttling `elementFromPoint`** on every `pointermove`. Measured: dragging a
  link across 200 nodes with 200 ports costs 16.6 ms/event, against 16.6 ms for
  a baseline node drag. Within the noise.
- **Per-edge path via a `$derived` inside the edge itself**, instead of the
  shared `edgeList`. The price of 199 edges is **+0.4 ms per drag event**, and
  zoom didn't change at all.

Both belong to the "obviously this must be faster" family. Don't do them
without a fresh measurement on the same rig.

### Pinned versions are not "outdated dependencies"

- **TypeScript is pinned to `6.0.3`; `latest` must not be installed.** 7.x is
  the Go rewrite of the compiler, while `svelte-check@4`/`svelte2tsx` declare a
  peer of `^5 || ^6` and don't work with it. Revisit when `svelte-check` adds
  TS 7 support.
- **`svelte-package` cannot exclude files** — the CLI has no exclude flag, hence
  `scripts/prune-dist.js`. Don't "simplify" the build by deleting it: tests and
  harnesses would ship in the tarball.
- **`changeset publish --dry-run` does not exist** in changesets v3 (CAC fails
  with `Unknown option`). Verify a release with `pnpm changeset status` plus
  `npm publish --dry-run` inside `packages/flowrap`.

## Performance baseline

Chromium headless, the `/many-nodes` route, 200 nodes. There is no threshold —
this is the reference point to compare regressions against. The numbers include
the Playwright CDP round-trip, so treat them as an upper bound.

| Scenario | Drag, 30 `pointermove` | Zoom, 20 ticks |
|---|---|---|
| 200 nodes, 0 edges | 488 ms (16.3 ms/event) | 667 ms (33.4 ms/tick) |
| 200 nodes, 199 edges | 501 ms (16.7 ms/event) | 667 ms (33.4 ms/tick) |
| 200 nodes + 200 ports, dragging a node | 494 ms (16.5 ms/event) | — |
| 200 nodes + 200 ports, dragging a link | 498 ms (16.6 ms/event) | — |

Time to 200 rendered nodes is 73 ms; DOMContentLoaded is 36 ms.

**Where to start tuning, if it ever becomes necessary:** the "node → board"
effect in `FlowBoard` rebuilds the whole `positions` object on every drag step —
200 keys per `pointermove` at that scale, and nothing there even uses
`bind:positions`. The obvious moves are laziness (don't build it while nobody
is subscribed to the prop) or an incremental update.

## Traps when writing tests

All four have already produced a false result — either a green test or a
"the node didn't move" when the code was perfectly fine.

1. **A node in negative local coordinates.** After a zoom or a pan, a node at
   world `(0,0)` moves off the edge and gets clipped by `overflow: hidden`.
   `boundingBox()` still reports honest geometry, but `mouse.down()` on it lands
   outside — on the page. The symptom is `dx: 0` in a formally correct test. Add
   an explicit "the node is inside the board" assertion so it fails loudly.
2. **A rounded zoom readout.** `Math.round(zoom * 100)` gives `1.22` against the
   real `Math.exp(0.2) = 1.2214`, and that difference eats the whole tolerance
   when comparing coordinates. Take the factor from the contract's formula, not
   off the page.
3. **A `PointerEvent` from `page.evaluate` is useless.** A synthetic pointer has
   no live `pointerId`, `setPointerCapture` throws `NotFoundError`, and the drag
   never starts. You need trusted input: `page.mouse`, or CDP
   `Input.dispatchTouchEvent` for touch.
4. **Nodes stacked on one spot steal `pointerdown` from each other.** Every
   `[data-fr-node]` is absolutely positioned; if a scenario gives its nodes no
   `x`/`y` they all sit at `(0,0)` and the last one in the DOM takes the event.
   That's exactly why the playground spreads its nodes out.

In jsdom `setPointerCapture` is a stub, so real capture semantics can only be
verified in e2e. Don't move such checks into unit tests: they'll pass there
without testing anything.

## What NOT to do

- **Don't add things "while you're in there"**: reconnect, deleting edges with
  the mouse, a minimap, controls, a background, multi-select, arrowheads. That's
  deliberately out of scope, not forgotten. Deleting edges with the mouse would
  require dropping `pointer-events: none` from the SVG layer — which breaks
  panning.
- **Don't turn the library into the owner of the graph** (see the first
  section).
- **Don't rewrite a test to make it pass.** The test is part of the contract. If
  the contract is in the way, that's a discussion, not a silent edit.
- **Don't remove the registry from `board-context`** "to simplify": the edge
  layer and all port geometry stand on it.
- **Don't change the `transform` string format**
  (`translate(<x>px,<y>px)`, no space, no `translate3d`) — three tests depend
  on it.
