# flowrap

## 1.0.0

### Major Changes

- 462f449: First stable release.
  
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

### Minor Changes

- 462f449: Connectors: a new `<FlowHandle id type />` component and mouse-drawn links.
  
  A port is declared **inside the node's content** and finds its node through
  context. Where it ends up is decided by the card's own layout, not by a library
  schema: `<FlowHandle>` only supplies the size, the shape and the gesture.
  
  **The library does not create edges.** A drag ends by calling `onconnect` on
  `<FlowBoard>` with a description of the connection — what to do with it is the
  consumer's decision. The graph state stays entirely on their side.
  
  - `<FlowBoard>` gained `onconnect` and `isValidConnection`;
  - port directions: `type="source" | "target" | "both"`;
  - validation runs self-connect, then direction compatibility, then the
    application's own `isValidConnection`;
  - a drop anywhere on a card — on its body, or on a port pointing the wrong way —
    lands on that node's nearest compatible port, and the preview line shows which
    one before you release the button; a node with ports but none suitable has no
    target; a node with no ports at all accepts the drop with `toHandle` =
    `undefined` and a border anchor;
  - cancelling: Escape, a drop on empty space, or `pointercancel`;
  - the preview line is drawn in the same SVG layer as the edges: above them, but
    still below the nodes; its look is configurable through `.fr-connection` and
    `--fr-connection-*`, the port dot through `.fr-handle` and `--fr-handle-*`;
  - the drop target is resolved by `document.elementFromPoint`, not `e.target`:
    during a drag the pointer is captured by the port and every event is
    retargeted onto it.
  
  Edges now respect `fromHandle`/`toHandle`, which until now were part of the key
  but didn't affect geometry: the anchor sits on the port's centre instead of the
  node's border. An edge without handles is drawn byte for byte as before.
  
  `BoardContext` gained the `handles` map, the `connection` state and the methods
  `registerHandle`/`setHandleGeometry`/`unregisterHandle` and
  `startConnection`/`moveConnection`/`endConnection`. `DraggableParams` gained an
  optional `onDragMove` carrying the absolute cursor position (`onDrag` stays
  incremental).
- 462f449: Edges: a new `<FlowEdge from to />` component.
  
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
