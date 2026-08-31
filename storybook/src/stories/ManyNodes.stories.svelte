<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { FlowBoard, FlowEdge, FlowNode } from 'flowrap';

  const { Story } = defineMeta({
    title: 'FlowBoard/Many nodes',
    component: FlowBoard,
    parameters: {
      docs: {
        description: {
          component: 'Load test: 200 nodes on one board. Dragging, zooming and panning should stay smooth.'
        }
      }
    }
  });

  // Deliberately non-reactive: these nodes are uncontrolled and mutate
  // x/y locally. If item.x were reactive, every parent update would wipe
  // out whatever the drag just did.
  const items = Array.from({ length: 200 }, (_, i) => ({
    id: `n${i}`,
    x: (i % 20) * 120,
    y: Math.floor(i / 20) * 80
  }));

  // A chain n0 → n1 → … → n199: 199 edges over the same 200 nodes.
  const links = items.slice(1).map((item, i) => ({
    id: `e${i}`,
    from: items[i]!.id,
    to: item.id
  }));
</script>

<Story name="200 nodes" exportName="ManyNodes" asChild>
  <div class="board-host">
    <FlowBoard>
      {#each items as item (item.id)}
        <FlowNode id={item.id} x={item.x} y={item.y}>
          <div class="card small">{item.id}</div>
        </FlowNode>
      {/each}
    </FlowBoard>
  </div>
</Story>

<Story name="200 nodes + 199 edges" exportName="ManyEdges" asChild>
  <div class="board-host">
    <FlowBoard>
      {#each items as item (item.id)}
        <FlowNode id={item.id} x={item.x} y={item.y}>
          <div class="card small">{item.id}</div>
        </FlowNode>
      {/each}
      {#each links as link (link.id)}
        <FlowEdge from={link.from} to={link.to} type="straight" />
      {/each}
    </FlowBoard>
  </div>
</Story>
