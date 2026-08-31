---
'flowrap': minor
---

Connectors: a new `<FlowHandle id type />` component and mouse-drawn links.

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
