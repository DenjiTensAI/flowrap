<script lang="ts">
  import FlowBoard from './FlowBoard.svelte';
  import FlowNode from './FlowNode.svelte';
  import FlowHandle from './FlowHandle.svelte';
  import type { Connection, ConnectionState, HandleType } from '../types';

  let {
    onconnect,
    isValidConnection,
    fromType = 'source',
    dropTarget = null,
    orphanHandle = false
  }: {
    onconnect?: (c: Connection) => void;
    isValidConnection?: (c: Connection) => boolean;
    fromType?: HandleType;
    dropTarget?: ConnectionState['target'];
    orphanHandle?: boolean;
  } = $props();

  let root = $state<HTMLElement | null>(null);

  /**
   * jsdom does no layout, so elementFromPoint can't answer honestly.
   * We stub elementFromPoint itself rather than the board's hit test:
   * the real board code (closest on data-fr-node/data-fr-handle) still
   * runs, and the test only says "here's what's under the cursor".
   * Anything that depends on real layout lives in the e2e suite.
   */
  $effect(() => {
    const target = dropTarget;
    const original = document.elementFromPoint;
    document.elementFromPoint = ((): Element | null => {
      if (!target || !root) return null;
      const nodeEl = root.querySelector(`[data-fr-node="${target.node}"]`);
      if (!nodeEl) return null;
      if (!target.handle) return nodeEl;
      return nodeEl.querySelector(`[data-fr-handle="${target.handle}"]`) ?? nodeEl;
    }) as typeof document.elementFromPoint;

    return () => {
      document.elementFromPoint = original;
    };
  });
</script>

{#if orphanHandle}
  <FlowHandle id="orphan" />
{:else}
  <div bind:this={root}>
    <FlowBoard {onconnect} {isValidConnection}>
      <FlowNode id="a" x={0} y={0}>
        <div data-testid="node-a">
          A
          <FlowHandle id="out" type={fromType} data-testid="handle-out" />
          <FlowHandle id="in" type="target" data-testid="handle-a-in" />
        </div>
      </FlowNode>

      <FlowNode id="b" x={200} y={100}>
        <div data-testid="node-b">
          B
          <FlowHandle id="in" type="target" data-testid="handle-b-in" />
          <!-- wrong direction on purpose: dropping on it must fall back
               to "in" instead of rejecting the connection -->
          <FlowHandle id="out" type="source" data-testid="handle-b-out" />
        </div>
      </FlowNode>

      <!-- no ports at all: a drop here must leave toHandle empty -->
      <FlowNode id="c" x={400} y={200}>
        <div data-testid="node-c">C</div>
      </FlowNode>
    </FlowBoard>
  </div>
{/if}
