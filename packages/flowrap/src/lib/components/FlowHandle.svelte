<script lang="ts">
  import { onDestroy, untrack, type Snippet } from 'svelte';
  import { draggable } from '../actions/draggable';
  import { getBoardContext } from '../context/board-context.svelte';
  import { getNodeContext } from '../context/node-context.svelte';
  import type { HandleType, Position } from '../types';

  interface FlowHandleProps {
    /** Unique within its node. */
    id: string;
    type?: HandleType;
    /** Your own markup inside the dot. */
    children?: Snippet;
    /** Everything else lands on the port element: class, aria-*, data-*. */
    [rest: string]: unknown;
  }

  let { id, type = 'both', children, ...rest }: FlowHandleProps = $props();

  // getNodeContext FIRST: a port outside <FlowNode> should complain about
  // <FlowNode>, not about <FlowBoard>.
  const node = getNodeContext();
  const board = getBoardContext();

  let el = $state<HTMLElement | null>(null);
  /** Gesture was cancelled (pointercancel) — the drop mustn't count. */
  let cancelled = false;

  untrack(() =>
    board.registerHandle({ nodeId: node.id, handleId: id, type, x: 0, y: 0, w: 0, h: 0 })
  );
  onDestroy(() => board.unregisterHandle(node.id, id));

  // type changed on the fly: replace the record wholesale but carry the
  // measured geometry over — it doesn't depend on direction.
  $effect(() => {
    const t = type;
    untrack(() => {
      const rec = board.handles.get(`${node.id}:${id}`);
      if (rec && rec.type !== t) board.registerHandle({ ...rec, type: t });
    });
  });

  /**
   * The port's offset relative to the node wrapper.
   *
   * Usually the port's offsetParent IS the node (the wrapper is already
   * position: absolute) and a single offsetLeft would do. The loop is for
   * cards with their own position: relative — that puts one more
   * offsetParent between the port and the node.
   */
  function offsetWithinNode(handleEl: HTMLElement): Position {
    const nodeEl = handleEl.closest('[data-fr-node]');
    let x = 0;
    let y = 0;
    let cur: HTMLElement | null = handleEl;
    while (cur && cur !== nodeEl) {
      x += cur.offsetLeft;
      y += cur.offsetTop;
      cur = cur.offsetParent as HTMLElement | null;
    }
    // Never reached the node (it isn't in the offsetParent chain) — its
    // own offset is a more honest answer than a sum up to the document.
    if (cur !== nodeEl) return { x: handleEl.offsetLeft, y: handleEl.offsetTop };
    return { x, y };
  }

  /**
   * Measure the geometry. The ResizeObserver watches both the port and
   * the node: a port can move without changing size at all — the card's
   * content only has to reflow around it.
   *
   * untrack for the same reason as setNodeSize in FlowNode:
   * setHandleGeometry reads and writes one and the same registry key.
   */
  $effect(() => {
    const handleEl = el;
    if (!handleEl) return;

    const measure = () => {
      const { x, y } = offsetWithinNode(handleEl);
      untrack(() =>
        board.setHandleGeometry(
          node.id,
          id,
          x,
          y,
          handleEl.offsetWidth,
          handleEl.offsetHeight
        )
      );
    };

    const ro = new ResizeObserver(measure);
    ro.observe(handleEl);
    // The port's offsetParent is the node (or a card inside it): watch
    // that too, or a reflow moves the port unnoticed.
    const parent = handleEl.offsetParent;
    if (parent instanceof HTMLElement) ro.observe(parent);

    // Measure once synchronously: ResizeObserver fires from the next
    // frame, and without geometry the anchor lands in the node's corner.
    measure();
    return () => ro.disconnect();
  });

  /**
   * Cancel. Clear the state through endConnection and THROW AWAY the
   * result: no separate cancelConnection, because "endConnection always
   * clears the state" already covers this case.
   */
  function cancel() {
    board.endConnection();
  }

  const connectParams = {
    onDragStart(p: Position) {
      cancelled = false;
      board.startConnection(node.id, id, board.clientToFlow(p));
    },
    onDrag() {
      // The connector doesn't want a delta — it wants the ABSOLUTE
      // cursor position, and that arrives in onDragMove.
    },
    onDragMove(p: Position) {
      board.moveConnection(board.clientToFlow(p), board.hitTest(p.x, p.y));
    },
    onDragEnd() {
      if (cancelled) {
        cancel();
        return;
      }
      const c = board.endConnection();
      if (c) board.emitConnect(c);
    }
  };
</script>

<!--
  Unlike <FlowEdge>, this one renders markup: you have to see the dot and
  you have to be able to hit it with a mouse.
-->
<div
  bind:this={el}
  {...rest}
  class="fr-handle {typeof rest.class === 'string' ? rest.class : ''}"
  data-fr-handle={id}
  data-fr-handle-type={type}
  onpointercancel={() => (cancelled = true)}
  use:draggable={connectParams}
>
  {@render children?.()}
</div>

<style>
  .fr-handle {
    display: inline-block;
    width: var(--fr-handle-size, 10px);
    height: var(--fr-handle-size, 10px);
    background: var(--fr-handle-bg, #fff);
    border: 1px solid var(--fr-handle-border, #666);
    border-radius: 50%;
    /* required: without it the browser eats the gesture as a scroll, and
       on desktop pointerdown leaks into the node drag and the board pan */
    touch-action: none;
    cursor: crosshair;
  }
</style>
