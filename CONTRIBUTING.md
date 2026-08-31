# Contributing

## Requirements

- node 24 (`.nvmrc` in the root — `nvm use` switches to it)
- pnpm 11 via corepack: `corepack enable pnpm`

The pnpm version is pinned by the `packageManager` field in the root
`package.json`, and CI reads it from there too, so local machines and the
pipeline never drift apart.

## Install

```bash
nvm use
corepack enable pnpm
pnpm install
```

The repository carries a `flowrap-specs` submodule that points at a **private**
design-notes repository. It is marked `update = none` in `.gitmodules`, so
`git clone --recursive` skips it and finishes cleanly without access — you get
an empty `flowrap-specs/` directory and everything else works. Nothing in the
build, the tests or CI reads it.

## Layout

```
packages/flowrap/   the library
storybook/          component gallery (Storybook + Svelte CSF)
playground/         SvelteKit app for manual QA and e2e
e2e/                Playwright specs (deliberately NOT a workspace package)
```

## Tests

```bash
pnpm -r test     # unit + component (vitest, jsdom)
pnpm -r check    # svelte-check
pnpm -r lint     # eslint
```

`pnpm -r <script>` silently skips packages that don't have that script.

Tests are part of the Definition of Done, not a separate "later" task. If a
test's contract gets in the way of the implementation, that's a reason to
discuss it — not to quietly rewrite the test.

## E2E

```bash
pnpm exec playwright install --with-deps chromium
pnpm --filter flowrap build      # the playground links against dist, not src
pnpm --filter playground build
pnpm e2e
```

`playwright.config.ts` lives in `e2e/`, not in the root, so a bare
`pnpm exec playwright test` won't find it — the path is passed explicitly, and
that's already wired into the root `e2e` script.

On Ubuntu/WSL, Chromium needs system libraries. If the run fails with
`libnspr4.so: cannot open shared object file`:

```bash
sudo apt-get install -y libnspr4 libnss3 libasound2t64
```

## Playground

```bash
pnpm --filter playground dev
```

**DX trap.** The playground imports `flowrap` as a package, and `exports` point
into `dist/`. An edit in `packages/flowrap/src/lib` is **not visible** in the
playground until the library is rebuilt. Keep this in a second terminal:

```bash
pnpm --filter flowrap dev
```

(that's `svelte-package --watch`). Otherwise half a day goes into debugging
"my changes aren't applying".

## Storybook

```bash
pnpm storybook          # dev server on :6006
pnpm build:storybook    # static build, the same one CI runs
```

Stories live in `storybook/src/stories/*.stories.svelte` and cover the same
scenarios as the playground routes. Same DX trap as the playground: Storybook
imports `flowrap` as a package, i.e. from `dist/` — keep
`pnpm --filter flowrap dev` running in a second terminal.

Three configuration traps, already hit and already fixed — don't revert them:

- **`storybook/vite.config.ts` with `svelte()` is mandatory.**
  `@storybook/svelte-vite` does NOT add `vite-plugin-svelte` itself; it expects
  it from the project's vite config. Without that file, even Storybook's own
  `PreviewRender.svelte` fails on `.svelte` with "Unexpected JSX expression".
- **Stories with ready-made markup must use `asChild`.** Without it, Svelte CSF
  wraps children in the component from `defineMeta({ component })`: for
  `component: FlowNode` that means a `<FlowNode>` outside a board and the
  "`<FlowNode>` must be rendered inside `<FlowBoard>`" failure; for
  `component: FlowBoard` it silently nests a second board. Stories that need
  args controls use `{#snippet template(args)}` instead of `asChild`.
- **A story's name must produce a valid JS identifier.** Cyrillic and a leading
  digit don't, so those stories carry an explicit `exportName`.

## Documentation

Four files, each with its own reader — don't mix them and don't duplicate:

| File | Reader | Contents |
|---|---|---|
| `README.md` | human consumer | showcase, quick start, prop tables, recipes |
| `packages/flowrap/llms.txt` | **agent** consumer | the same API as one self-contained file, no images and no external links; ships in the npm tarball, lands as `node_modules/flowrap/llms.txt` |
| `AGENTS.md` | **agent** contributor | repository map, disproven hypotheses, measurements, traps |
| `CONTRIBUTING.md` | human contributor | this file: commands, environment, invariants |

The rule: **invariants live here only**, measurements and dead-end write-ups
live in `AGENTS.md` only. Cross-referencing is fine, copying is not.

`README.md` is English; its Russian translation is `docs/README.ru.md`. Change
one, change the other.

Changing the public API means updating `README.md`, `docs/README.ru.md`,
`llms.txt` and the TSDoc on the prop. TSDoc matters more than prose: it is the
only documentation that reaches the consumer's IDE and their agent's context,
because `svelte-package` carries the comments into `dist/*.d.ts`.

The "What flowrap does NOT have" section in `llms.txt` is not a formality.
Without it, an agent reasoning by analogy with react-flow / svelte-flow
confidently writes `<MiniMap />`, `onEdgeClick` and `edges={[]}`, none of which
exist here, and burns a cycle debugging it. The README deliberately has no such
section — a human reader doesn't need a list of absent features.

## Release

Versioning is handled by Changesets.

```bash
pnpm changeset            # describe a change
pnpm changeset version    # bump the version and build the CHANGELOG
pnpm changeset publish    # publish (CI does this via release.yml)
```

## Architectural invariants

Don't break these without a discussion — the tests are built on them:

- **`nodes` in board-context is a `SvelteMap`, not `$state(new Map())`.**
  `$state` proxies plain objects and arrays, but not collections: with a plain
  `Map` the unit tests would stay green while `bind:positions` silently stopped
  updating.
- **`updateNode` never touches `rev`, and `applyPositions` bumps it only for
  records that actually changed by value.** An unconditional `rev++` closes a
  node → board → node loop.
- **Any effect that reads and writes the same source must wrap the read in
  `untrack`.** This covers `setNodeEl` (it does `nodes.get` and `nodes.set` on
  one key) and both `positions` synchronisation effects. The symptom of getting
  it wrong is `effect_update_depth_exceeded` on mount.
- **The transform format is strictly `translate(<x>px,<y>px)`** — no space after
  the comma, no `translate3d`: three tests depend on that exact string.
- **The pan delta is NOT divided by zoom, the node delta IS** (`scaleDelta`).
- **`transform-origin: 0 0` on `.fr-world`** — the zoom formulas are derived for
  an origin in the top-left corner.
- **`touch-action: none` on `.fr-viewport` and `[data-fr-node]`** — otherwise the
  browser eats `pointermove` as a page scroll.
- **Don't delete `NodeRecord.el` or the board-context registry "to simplify
  things"** — the edge layer is built on top of them.
- **The SVG edge layer renders BEFORE `{@render children()}`** — otherwise the
  lines land on top of the nodes. A test depends on that order.
- **`.fr-edges` must have `pointer-events: none` and `overflow: visible`.**
  Without the first, edges intercept `pointerdown` and break panning; without
  the second, lines to nodes that moved into negative world coordinates get
  clipped.
- **A node's world size comes from `offsetWidth`/`offsetHeight`, NOT
  `getBoundingClientRect()`.** The former aren't scaled by the `.fr-world`
  transform; the latter gives screen geometry and drags the anchors off at
  `zoom ≠ 1`.
- **`FlowEdge` registers in an `$effect`, not in the `<script>` body** — unlike
  `FlowNode`. The reason is lifecycle: the return from `$effect` unregisters
  without a separate `onDestroy`, and a second effect is needed for `updateEdge`
  on prop changes anyway. The original explanation — "otherwise
  `state_unsafe_mutation`" — was **disproven by a spike**: mutating a
  `SvelteMap` from a child's script body is fine, because `.set()` there runs
  outside the parent's active computation. Details of the spike, and why it
  requires a canary, are in [AGENTS.md](AGENTS.md#disproven-hypotheses-and-dead-ends).
- **An edge's default key is `$props.id()`, not `` `${from}->${to}` ``**: two
  edges between the same pair of nodes would overwrite each other.
- **`setNodeSize` must bail out early when the size hasn't changed.**
  `ResizeObserver` also fires for changes that don't move the numbers — without
  the comparison, every one of its calls would recompute the whole edge layer.
  The same goes for `setHandleGeometry`.
- **`pointerdown` on a port must stop propagation** (`draggable` does this
  itself), and `FlowNode` must have
  `filter: (e) => !e.target.closest('[data-fr-handle]')`. Without the first, the
  node's drag calls `setPointerCapture` and **steals the capture from the
  port**: the connector gets a single `pointermove` and dies, while the node
  slides out from under the cursor. Measured in Chromium: without
  `stopPropagation` only **1 `pointermove` out of 7** reaches the port and the
  node moves `translate(60px,60px)` → `translate(152px,122px)`; with it, 7 out
  of 7 and the node stays put.
- **The drop target is resolved by `document.elementFromPoint`, not
  `e.target`.** During a drag the pointer is captured by the port and every
  event is retargeted onto it; `elementFromPoint` ignores the capture and
  answers honestly about geometry.
- **A drop that misses the dot but hits the node lands on that node's nearest
  compatible port** (`nearestHandle`). Otherwise the link arrives at an
  arbitrary point on the node's border while a port is drawn right there, which
  reads as a rendering bug. The search only considers ports of the node the hit
  test already picked: there is no magnet across empty space. Landing exactly on
  a port pointing the WRONG way is treated like landing on the body — otherwise
  a drop on the dot would be rejected where a drop one pixel away succeeds.
- **"The node has no ports" and "no suitable ports" are DIFFERENT cases.** The
  first returns `handle: undefined` (the border anchor), the
  second returns `null`, i.e. no target. They can't be merged: the "no port
  means compatible with anything" rule is about bare nodes, and through that
  loophole a drag from a `target` would land anywhere.
- **`endConnection` ALWAYS clears `connection`, before any checks.** Otherwise a
  rejected drop leaves the preview line hanging. Cancellation rests on the same
  contract: Escape and `pointercancel` simply call `endConnection` and throw the
  result away.
- **A port's offset is computed by walking the `offsetParent` chain up to the
  node wrapper**, not by a single `offsetLeft`: a card with `position: relative`
  inserts another `offsetParent` in between. `offsetLeft`/`offsetTop` are
  already in world units — never divide them by `zoom` (the same property the
  node size has).
