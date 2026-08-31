---
"flowrap": major
---

First stable release.

flowrap is a wrapper-first flow board for Svelte 5: you wrap a component you
already have and get a position, a drag gesture, ports and links. It renders no
styling of its own beyond the port dot and the link stroke, and it keeps no
graph — your array of links is the source of truth, and a finished drag simply
calls `onconnect`.

What's in it:

- `<FlowBoard>` — zoom to the cursor and panning, with `bind:zoom`, `bind:pan`
  and `bind:positions` as a two-way snapshot of every node;
- `<FlowNode>` — a wrapper that gives any markup a position and a drag;
  controlled or uncontrolled depending on `bind:`;
- `<FlowEdge>` — headless links in three shapes (`bezier`, `straight`, `step`),
  drawn by one shared SVG layer beneath the nodes;
- `<FlowHandle>` — ports with directions (`source` / `target` / `both`),
  links drawn with the mouse, a live preview line, validation through
  `isValidConnection`, and cancellation with Escape or a drop on empty space;
- `screenToFlow` / `flowToScreen` coordinate helpers.

No runtime dependencies; `svelte@^5` is the only peer.

From here on, semantic versioning covers the four components and their props,
the two helpers, the exported types, and — because you style against them — the
`.fr-*` class names, the `data-fr-*` attributes and the `--fr-*` CSS variables.
Renaming any of those is a major release.
