<script lang="ts">
  import { untrack } from 'svelte';
  import { getBoardContext } from '../context/board-context.svelte';
  import type { EdgePathType } from '../types';

  interface FlowEdgeProps {
    from: string;
    to: string;
    /** Registry key. Defaults to $props.id(), unique per instance. */
    id?: string;
    type?: EdgePathType;
    /** Ports at either end: they move the anchor onto the port's centre. */
    fromHandle?: string;
    toHandle?: string;
  }

  let {
    from,
    to,
    id,
    type = 'bezier',
    fromHandle,
    toHandle
  }: FlowEdgeProps = $props();

  const board = getBoardContext();

  // $props.id() is unique per instance. `${from}->${to}` would NOT do as
  // a default key: two edges between the same pair of nodes would
  // overwrite each other.
  const uid = $props.id();
  const key = $derived(id ?? uid);

  // Registration lives in an $effect rather than in the <script> body,
  // unlike FlowNode.
  //
  // Not because of state_unsafe_mutation — that was the guess, and a
  // spike disproved it: a SvelteMap mutates happily from a child's script
  // body and the edge renders fine. The real reason is lifecycle: the
  // return from $effect unregisters without a separate onDestroy, and a
  // second effect is needed for updateEdge anyway.
  //
  // untrack, same as in setNodeEl: registerEdge writes to the very source
  // whose read would subscribe the effect to itself. This effect depends
  // ONLY on key, so changing from/to/type doesn't restart it — that's the
  // second effect's job.
  $effect(() => {
    const k = key;
    untrack(() => board.registerEdge(k, { key: k, from, to, type, fromHandle, toHandle }));
    return () => untrack(() => board.unregisterEdge(k));
  });

  $effect(() => {
    const edge = { key, from, to, type, fromHandle, toHandle };
    untrack(() => board.updateEdge(edge.key, edge));
  });
</script>

<!--
  Headless: renders no markup, only registers itself in the context.
  Layer order belongs to the board, not to where you declared the edge.
-->
