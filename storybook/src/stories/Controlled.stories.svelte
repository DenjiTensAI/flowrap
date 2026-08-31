<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { FlowBoard, FlowNode } from 'flowrap';

  const { Story } = defineMeta({
    title: 'FlowNode/Controlled',
    component: FlowNode,
    parameters: {
      docs: {
        description: {
          component:
            'There is no mode flag — the presence of `bind:` decides everything. With `bind:x`/`bind:y` ' +
            'the position lives in the parent, and assigning to it moves the node.'
        }
      }
    }
  });
</script>

<script lang="ts">
  let x = $state(0);
  let y = $state(0);
</script>

<Story name="Controlled" asChild>
  <div class="panel">
    <span data-testid="readout"><code>x: {x}, y: {y}</code></span>
    <button
      data-testid="reset"
      onclick={() => {
        x = 0;
        y = 0;
      }}>Reset</button
    >
  </div>

  <div class="board-host">
    <FlowBoard>
      <FlowNode id="controlled" bind:x bind:y>
        <div data-testid="node" class="card">Controlled node</div>
      </FlowNode>
    </FlowBoard>
  </div>
</Story>

<Story name="Uncontrolled" asChild>
  <div class="board-host">
    <FlowBoard>
      <!-- no bind: x/y are just initial values, the node keeps the position -->
      <FlowNode id="uncontrolled" x={40} y={40}>
        <div class="card">Uncontrolled node</div>
      </FlowNode>
    </FlowBoard>
  </div>
</Story>

<Story name="Disabled" asChild>
  <div class="board-host">
    <FlowBoard>
      <FlowNode id="disabled" x={40} y={40} disabled>
        <div class="card" style="cursor: not-allowed">disabled — dragging is off</div>
      </FlowNode>
      <FlowNode id="enabled" x={40} y={140}>
        <div class="card">an ordinary node — drag away</div>
      </FlowNode>
    </FlowBoard>
  </div>
</Story>
