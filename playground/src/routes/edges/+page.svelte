<script lang="ts">
  import { FlowBoard, FlowEdge, FlowNode } from 'flowrap';
  type EdgeType = 'straight' | 'bezier' | 'step';
  let type = $state<EdgeType>('bezier');
</script>

<label>
  Line type:
  <select data-testid="edge-type" bind:value={type}>
    <option value="bezier">bezier</option>
    <option value="straight">straight</option>
    <option value="step">step</option>
  </select>
</label>

<div class="board-host">
  <FlowBoard>
    <!-- Nodes are spread out on purpose: stacked on one spot, the last
         one in the DOM swallows pointerdown and e2e drags the wrong node. -->
    <FlowNode id="a" x={60} y={60}>
      <div data-testid="node-a" class="card">A</div>
    </FlowNode>
    <FlowNode id="b" x={360} y={200}>
      <div data-testid="node-b" class="card">B</div>
    </FlowNode>
    <FlowNode id="c" x={60} y={300}>
      <div data-testid="node-c" class="card">C</div>
    </FlowNode>

    <FlowEdge from="a" to="b" {type} />
    <FlowEdge from="a" to="c" {type} />
  </FlowBoard>
</div>
