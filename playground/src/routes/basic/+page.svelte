<script lang="ts">
  import { FlowBoard, FlowNode } from 'flowrap';
  // Nodes are spread out: all three are absolutely positioned, and piled
  // up at (0,0) the last one in the DOM would swallow everyone else's
  // pointerdown.
</script>

<div class="board-host">
  <FlowBoard>
    <FlowNode id="text" x={40} y={40}>
      <div data-testid="node-text" class="card">Just some text</div>
    </FlowNode>
    <FlowNode id="button" x={40} y={140}>
      <button data-testid="node-button">A button inside a node</button>
    </FlowNode>
    <FlowNode id="image" x={40} y={240}>
      <div data-testid="node-image" class="card">🖼 placeholder image</div>
    </FlowNode>
  </FlowBoard>
</div>
