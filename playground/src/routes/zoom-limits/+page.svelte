<script lang="ts">
  import { FlowBoard, FlowNode } from 'flowrap';
  let zoom = $state(1);
</script>

<p data-testid="zoom-readout">{Math.round(zoom * 100)}%</p>

<div class="board-host">
  <FlowBoard bind:zoom minZoom={0.5} maxZoom={1.5}>
    <FlowNode id="a"><div class="card">A</div></FlowNode>
  </FlowBoard>
</div>
