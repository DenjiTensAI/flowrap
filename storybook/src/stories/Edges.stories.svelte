<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { FlowBoard, FlowEdge, FlowNode } from 'flowrap';

  const { Story } = defineMeta({
    title: 'FlowEdge/Edges',
    component: FlowEdge,
    args: { from: 'a', to: 'b', type: 'bezier' },
    argTypes: {
      type: { control: 'select', options: ['bezier', 'straight', 'step'] },
      from: { control: 'text' },
      to: { control: 'text' }
    },
    parameters: {
      docs: {
        description: {
          component:
            '`<FlowEdge>` is declared next to the nodes, with no separate `edges[]` array. ' +
            'It is headless: it only registers itself in the context, and one SVG layer on the board ' +
            'draws the lines — under the nodes and with `pointer-events: none`, so panning still works. ' +
            'The anchor is the node centre clipped to its rectangle; stroke width stays constant while zooming.'
        }
      }
    }
  });
</script>

<!--
  Nodes are spread out on purpose, same reason as in Basic: stacked on one
  spot, the last one in the DOM swallows pointerdown.
-->
{#snippet board(type: 'bezier' | 'straight' | 'step', from = 'a', to = 'b')}
  <div class="board-host">
    <FlowBoard>
      <FlowNode id="a" x={60} y={60}>
        <div data-testid="node-a" class="card">A</div>
      </FlowNode>
      <FlowNode id="b" x={360} y={200}>
        <div data-testid="node-b" class="card">B</div>
      </FlowNode>
      <FlowNode id="c" x={60} y={300}>
        <div data-testid="node-c" class="card">C</div>
      </FlowNode>

      <FlowEdge {from} {to} {type} />
      <FlowEdge from="a" to="c" {type} />
    </FlowBoard>
  </div>
{/snippet}

<Story name="Playground">
  {#snippet template(args)}
    {@render board(args.type ?? 'bezier', args.from, args.to)}
  {/snippet}
</Story>

<Story name="Bezier" asChild>
  {@render board('bezier')}
</Story>

<Story name="Straight" asChild>
  {@render board('straight')}
</Story>

<Story name="Step" asChild>
  {@render board('step')}
</Story>

<!--
  The default edge key is $props.id(), unique per instance, rather than
  `${from}->${to}`: otherwise two edges between the same pair of nodes
  would overwrite each other in the registry.
-->
<Story name="Two nodes, two edges" exportName="TwoParallelEdges" asChild>
  <div class="board-host">
    <FlowBoard>
      <FlowNode id="a" x={60} y={60}><div class="card">A</div></FlowNode>
      <FlowNode id="b" x={360} y={200}><div class="card">B</div></FlowNode>
      <FlowEdge from="a" to="b" type="straight" />
      <FlowEdge from="a" to="b" type="step" />
    </FlowBoard>
  </div>
</Story>

<!--
  The data-driven version falls out of plain Svelte and needs no extra
  API of its own.
-->
<Story name="From a data array" exportName="DataDriven">
  {#snippet template()}
    {@const nodes = [
      { id: 'in', x: 40, y: 180, label: 'intake' },
      { id: 'parse', x: 240, y: 60, label: 'parse' },
      { id: 'check', x: 240, y: 300, label: 'validate' },
      { id: 'out', x: 460, y: 180, label: 'output' }
    ]}
    {@const links = [
      { id: 'l1', from: 'in', to: 'parse' },
      { id: 'l2', from: 'in', to: 'check' },
      { id: 'l3', from: 'parse', to: 'out' },
      { id: 'l4', from: 'check', to: 'out' }
    ]}
    <div class="board-host">
      <FlowBoard>
        {#each nodes as n (n.id)}
          <FlowNode id={n.id} x={n.x} y={n.y}><div class="card">{n.label}</div></FlowNode>
        {/each}
        {#each links as link (link.id)}
          <FlowEdge from={link.from} to={link.to} />
        {/each}
      </FlowBoard>
    </div>
  {/snippet}
</Story>

<!--
  Edge styling is done in CSS: the .fr-edge selector or the
  --fr-edge-stroke / --fr-edge-width variables. There is no style prop.
-->
<Story name="Custom look via CSS" exportName="CustomCss" asChild>
  <div class="board-host themed">
    <FlowBoard>
      <FlowNode id="a" x={60} y={60}><div class="card">A</div></FlowNode>
      <FlowNode id="b" x={360} y={200}><div class="card">B</div></FlowNode>
      <FlowEdge from="a" to="b" />
    </FlowBoard>
  </div>
</Story>

<style>
  .themed {
    --fr-edge-stroke: #c2410c;
    --fr-edge-width: 3;
  }
</style>
