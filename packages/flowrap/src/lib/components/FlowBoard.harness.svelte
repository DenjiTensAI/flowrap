<script lang="ts">
  import FlowBoard from './FlowBoard.svelte';
  import FlowNode from './FlowNode.svelte';

  let { onState }: {
    onState: (s: { zoom: number; pan: { x: number; y: number } }) => void
  } = $props();

  let zoom = $state(1);
  let pan = $state({ x: 0, y: 0 });

  $effect(() => {
    onState({ zoom, pan });
  });
</script>

<FlowBoard bind:zoom bind:pan>
  <div data-testid="content">content</div>
  <!-- here to prove that dragging a node does NOT pan the board -->
  <FlowNode id="hn">
    <div data-testid="hnode">node</div>
  </FlowNode>
</FlowBoard>
