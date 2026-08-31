---
'flowrap': minor
---

Edges: a new `<FlowEdge from to />` component.

Declared inside `<FlowBoard>` next to the nodes — no separate `edges[]` array
and no type registration. The component is headless: it registers itself with
the board's context, and one shared SVG layer draws the lines — in world
coordinates, beneath the nodes and with `pointer-events: none`, so it never
breaks panning or dragging.

- three line shapes: `type="bezier" | "straight" | "step"`;
- the anchor is the node's centre clipped to its rectangle; the world size comes
  from `offsetWidth`/`offsetHeight` via a `ResizeObserver`;
- stroke width stays constant while zooming (`vector-effect="non-scaling-stroke"`);
- appearance is CSS: `.fr-edge`, `--fr-edge-stroke`, `--fr-edge-width`;
- an edge with an unknown `from`/`to` is silently not drawn;
- two edges between the same pair of nodes don't collapse into one — the default
  key is `$props.id()`, not `` `${from}->${to}` ``.

`NodeRecord` gained `w`/`h`, and `BoardContext` gained `setNodeSize`,
`registerEdge`/`updateEdge`/`unregisterEdge` and the `edges` map.
