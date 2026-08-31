<script lang="ts">
  import FlowBoard from './FlowBoard.svelte';
  import FlowNode from './FlowNode.svelte';

  let { controlled = false, initialZoom = 1, onXY }: {
    controlled?: boolean;
    initialZoom?: number;
    onXY?: (p: { x: number; y: number }) => void;
  } = $props();

  let zoom = $state(initialZoom);
  let x = $state(0);
  let y = $state(0);

  $effect(() => {
    onXY?.({ x, y });
  });
</script>

<FlowBoard bind:zoom>
  {#if controlled}
    <FlowNode id="n1" bind:x bind:y>
      <div data-testid="node">node</div>
    </FlowNode>
  {:else}
    <FlowNode id="n1">
      <div data-testid="node">node</div>
    </FlowNode>
  {/if}
</FlowBoard>
