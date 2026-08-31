<script lang="ts">
  import FlowBoard from './FlowBoard.svelte';
  import FlowNode from './FlowNode.svelte';

  type P = Record<string, { x: number; y: number }>;
  let { onPositions }: { onPositions?: (p: P) => void } = $props();

  let positions = $state<P>({});

  $effect(() => {
    onPositions?.(positions);
  });
</script>

<button data-testid="apply" onclick={() => { positions = { a: { x: 77, y: 88 } }; }}>
  apply
</button>

<FlowBoard bind:positions>
  <FlowNode id="a"><div data-testid="node-a">A</div></FlowNode>
</FlowBoard>
