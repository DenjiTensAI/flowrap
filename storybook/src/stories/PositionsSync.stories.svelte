<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { FlowBoard, FlowNode } from 'flowrap';

  const { Story } = defineMeta({
    title: 'FlowBoard/Positions sync',
    component: FlowBoard,
    parameters: {
      docs: {
        description: {
          component:
            '`bind:positions` is a two-way `Record<id, {x, y}>` over every node on the board. ' +
            'Dragging pushes coordinates up, assigning from outside moves the nodes. ' +
            'While a node is being dragged, outside assignments to it are ignored.'
        }
      }
    }
  });
</script>

<script lang="ts">
  let positions = $state<Record<string, { x: number; y: number }>>({});

  function save() {
    localStorage.setItem('flowrap-positions', JSON.stringify(positions));
  }
  function load() {
    const raw = localStorage.getItem('flowrap-positions');
    if (raw) positions = JSON.parse(raw);
  }
</script>

<Story name="Positions sync" exportName="PositionsSync" asChild>
  <div class="panel">
    <button data-testid="save" onclick={save}>Save</button>
    <button data-testid="load" onclick={load}>Load</button>
    <button onclick={() => (positions = { a: { x: 200, y: 40 }, b: { x: 200, y: 160 } })}>
      Lay out programmatically
    </button>
  </div>
  <pre class="readout" data-testid="positions-json">{JSON.stringify(positions, null, 2)}</pre>

  <div class="board-host">
    <FlowBoard bind:positions>
      <FlowNode id="a" x={40} y={40}><div class="card">A</div></FlowNode>
      <FlowNode id="b" x={40} y={140}><div class="card">B</div></FlowNode>
    </FlowBoard>
  </div>
</Story>
