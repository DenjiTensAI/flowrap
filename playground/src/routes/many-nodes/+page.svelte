<script lang="ts">
  import { FlowBoard, FlowNode } from 'flowrap';
  // Deliberately non-reactive: these nodes are uncontrolled and mutate
  // x/y locally. If item.x were reactive, every parent update would wipe
  // out whatever the drag just did.
  const items = Array.from({ length: 200 }, (_, i) => ({
    id: `n${i}`,
    x: (i % 20) * 120,
    y: Math.floor(i / 20) * 80
  }));
</script>

<div class="board-host">
  <FlowBoard>
    {#each items as item (item.id)}
      <FlowNode id={item.id} x={item.x} y={item.y}>
        <div class="card small">{item.id}</div>
      </FlowNode>
    {/each}
  </FlowBoard>
</div>
