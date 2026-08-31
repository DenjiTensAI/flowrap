<script lang="ts">
  import { FlowBoard, FlowNode } from 'flowrap';
  let positions = $state<Record<string, { x: number; y: number }>>({});

  function save() {
    localStorage.setItem('flowrap-positions', JSON.stringify(positions));
  }
  function load() {
    const raw = localStorage.getItem('flowrap-positions');
    if (raw) positions = JSON.parse(raw);
  }
</script>

<pre data-testid="positions-json">{JSON.stringify(positions, null, 2)}</pre>
<button data-testid="save" onclick={save}>Save</button>
<button data-testid="load" onclick={load}>Load</button>

<div class="board-host">
  <FlowBoard bind:positions>
    <FlowNode id="a" x={40} y={40}><div class="card">A</div></FlowNode>
    <FlowNode id="b" x={40} y={140}><div class="card">B</div></FlowNode>
  </FlowBoard>
</div>
