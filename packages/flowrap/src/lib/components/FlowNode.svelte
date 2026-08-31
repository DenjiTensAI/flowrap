<script lang="ts">
  import { onDestroy, untrack, type Snippet } from 'svelte';
  import { draggable } from '../actions/draggable';
  import { scaleDelta } from '../core/coordinates';
  import { getBoardContext } from '../context/board-context.svelte';
  import { setNodeContext } from '../context/node-context.svelte';

  interface FlowNodeProps {
    id: string;
    /** $bindable: with no `bind:` the node is simply uncontrolled. */
    x?: number;
    y?: number;
    disabled?: boolean;
    children?: Snippet;
  }

  let {
    id,
    x = $bindable(0),
    y = $bindable(0),
    disabled = false,
    children
  }: FlowNodeProps = $props();

  const board = getBoardContext();
  // Ports inside the content find their node through context, not a prop.
  // A getter rather than a snapshot: id is a prop, and the context has to
  // hand out the current one.
  setNodeContext({
    get id() {
      return id;
    }
  });

  let el = $state<HTMLElement | null>(null);
  let dragging = false;

  // The revision this node has already accepted. A bump in the registry
  // means "someone set my position from outside, via bind:positions".
  let seenRev = 0;

  // Register the initial position once, at init — on purpose. untrack
  // spells that out for the compiler (state_referenced_locally).
  untrack(() => board.registerNode(id, { x, y }));
  onDestroy(() => board.unregisterNode(id));

  // untrack is mandatory: setNodeEl does nodes.get(id) and
  // nodes.set(id, ...) on the SAME key. Without it the effect subscribes
  // to the source it writes → effect_update_depth_exceeded.
  $effect(() => {
    const node = el;
    if (node) untrack(() => board.setNodeEl(id, node));
  });

  // World size of the node, for edge anchors. offsetWidth rather than
  // entry.contentRect: contentRect leaves out padding and border, and an
  // edge has to land on the node's visible border.
  //
  // untrack is mandatory for the same reason as in setNodeEl: setNodeSize
  // reads and writes one and the same key.
  $effect(() => {
    const node = el;
    if (!node) return;
    const ro = new ResizeObserver(() => {
      untrack(() => board.setNodeSize(id, node.offsetWidth, node.offsetHeight));
    });
    ro.observe(node);
    // Measure once synchronously: ResizeObserver only fires from the
    // next frame, and with no size the edge layer draws nothing.
    untrack(() => board.setNodeSize(id, node.offsetWidth, node.offsetHeight));
    return () => ro.disconnect();
  });

  // board → node: accept a position that was assigned from outside.
  $effect(() => {
    const rec = board.nodes.get(id);
    if (!rec || rec.rev === seenRev) return;

    seenRev = rec.rev;
    // While a drag is live, outside assignments are ignored — otherwise a
    // save/load mid-drag yanks the node out from under the cursor.
    if (untrack(() => dragging)) return;

    x = rec.x;
    y = rec.y;
  });

  function onDragStart() {
    dragging = true;
  }

  function onDrag(delta: { x: number; y: number }) {
    // Screen delta must become a world delta, or at zoom ≠ 1 the node
    // outruns (or lags behind) the cursor.
    const world = scaleDelta(delta, board.getViewport().zoom);
    x += world.x;
    y += world.y;
    board.updateNode(id, { x, y });
  }

  function onDragEnd() {
    dragging = false;
  }

  // Stable reference with a getter: we don't rely on Svelte calling
  // action.update() when disabled changes.
  const dragParams = {
    // Second line of defence: pointerdown on a port is already stopped
    // by the port's own draggable, but if one ever slips through, the
    // node's drag steals the pointer capture from the port and the
    // connection dies after the very first pointermove.
    filter: (e: PointerEvent) =>
      !(e.target as HTMLElement | null)?.closest?.('[data-fr-handle]'),
    onDragStart,
    onDrag,
    onDragEnd,
    get disabled() {
      return disabled;
    }
  };
</script>

<div
  bind:this={el}
  data-fr-node={id}
  style="transform: translate({x}px,{y}px)"
  use:draggable={dragParams}
>
  {@render children?.()}
</div>

<style>
  [data-fr-node] {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
    touch-action: none;
  }
</style>
