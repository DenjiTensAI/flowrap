<script lang="ts">
  import { FlowBoard, FlowNode } from 'flowrap';
  let x = $state(0);
  let y = $state(0);
</script>

<p data-testid="readout">x: {x}, y: {y}</p>
<button data-testid="reset" onclick={() => { x = 0; y = 0; }}>Reset</button>

<div class="board-host">
  <FlowBoard>
    <FlowNode id="controlled" bind:x bind:y>
      <div data-testid="node" class="card">Controlled node</div>
    </FlowNode>
  </FlowBoard>
</div>
