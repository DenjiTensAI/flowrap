<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { FlowBoard, FlowEdge, FlowHandle, FlowNode } from 'flowrap';
  import type { Connection } from 'flowrap';

  const { Story } = defineMeta({
    title: 'FlowHandle/Connectors',
    component: FlowHandle,
    args: { id: 'out', type: 'source' },
    argTypes: {
      type: { control: 'select', options: ['source', 'target', 'both'] },
      id: { control: 'text' }
    },
    parameters: {
      docs: {
        description: {
          component:
            '`<FlowHandle>` is a port inside a node\'s content. Where it ends up is decided by the ' +
            'card\'s markup, not by a schema: the library only supplies the size, the shape and the gesture. ' +
            'Dragging from a port ends in an `onconnect` call on `<FlowBoard>` — the library does NOT ' +
            'create the edge, and the graph state stays entirely with the consumer. ' +
            'Cancel with Escape, a drop on empty space, or `pointercancel`.'
        }
      }
    }
  });

  type Link = {
    id: string;
    from: string;
    to: string;
    fromHandle?: string;
    toHandle?: string;
  };
</script>

<script lang="ts">
  let links = $state<Link[]>([]);
  let bothLinks = $state<Link[]>([]);
  let rejectedLinks = $state<Link[]>([]);
  let sideLinks = $state<Link[]>([]);

  const add = (list: Link[], c: Connection): Link[] => [
    ...list,
    { id: crypto.randomUUID(), ...c }
  ];
</script>

<!--
  Nodes are spread out on purpose, same reason as in Basic: stacked on one
  spot, the last one in the DOM swallows pointerdown.
-->
<Story name="Dragging connections" exportName="Interactive">
  {#snippet template(args)}
    <p class="readout">
      Drag from node A's round port to a port on node B or C. Links: {links.length}
    </p>
    <div class="board-host">
      <FlowBoard onconnect={(c) => (links = add(links, c))}>
        <FlowNode id="a" x={60} y={60}>
          <div class="card">A <FlowHandle id={args.id ?? 'out'} type={args.type} /></div>
        </FlowNode>
        <FlowNode id="b" x={380} y={200}>
          <div class="card"><FlowHandle id="in" type="target" /> B</div>
        </FlowNode>
        <FlowNode id="c" x={60} y={320}>
          <div class="card"><FlowHandle id="in" type="target" /> C</div>
        </FlowNode>

        {#each links as link (link.id)}
          <FlowEdge
            from={link.from}
            to={link.to}
            fromHandle={link.fromHandle}
            toHandle={link.toHandle}
          />
        {/each}
      </FlowBoard>
    </div>
  {/snippet}
</Story>

<!--
  type="both" is for undirected graphs: the port works as a start and as
  an end, so you can drag either way.
-->
<Story name="Undirected graph (type=both)" exportName="BothDirections" asChild>
  <p class="readout">Every port is `type="both"`: drag from any of them to any other.</p>
  <div class="board-host">
    <FlowBoard onconnect={(c) => (bothLinks = add(bothLinks, c))}>
      <FlowNode id="a" x={60} y={60}>
        <div class="card">A <FlowHandle id="p" /></div>
      </FlowNode>
      <FlowNode id="b" x={380} y={200}>
        <div class="card"><FlowHandle id="p" /> B</div>
      </FlowNode>
      <FlowNode id="c" x={60} y={320}>
        <div class="card"><FlowHandle id="p" /> C</div>
      </FlowNode>

      {#each bothLinks as link (link.id)}
        <FlowEdge
          from={link.from}
          to={link.to}
          fromHandle={link.fromHandle}
          toHandle={link.toHandle}
        />
      {/each}
    </FlowBoard>
  </div>
</Story>

<!--
  Connection policy belongs to the app, not the core: the library doesn't
  reject duplicates itself — it knows nothing about your edges as a graph.
-->
<Story name="isValidConnection: no duplicates" exportName="RejectDuplicates" asChild>
  <p class="readout">
    The same link a second time won't happen: `isValidConnection` rejects the duplicate.
  </p>
  <div class="board-host">
    <FlowBoard
      isValidConnection={(c) =>
        !rejectedLinks.some((l) => l.from === c.from && l.to === c.to)}
      onconnect={(c) => (rejectedLinks = add(rejectedLinks, c))}
    >
      <FlowNode id="a" x={60} y={60}>
        <div class="card">A <FlowHandle id="out" type="source" /></div>
      </FlowNode>
      <FlowNode id="b" x={380} y={200}>
        <div class="card"><FlowHandle id="in" type="target" /> B</div>
      </FlowNode>

      {#each rejectedLinks as link (link.id)}
        <FlowEdge
          from={link.from}
          to={link.to}
          fromHandle={link.fromHandle}
          toHandle={link.toHandle}
        />
      {/each}
    </FlowBoard>
  </div>
</Story>

<!--
  There is no `handles: [{ position: 'right' }]` schema and there won't be
  one: a port is an ordinary element inside the card, laid out by your CSS.
-->
<Story name="Ports on all four sides" exportName="FourSides" asChild>
  <p class="readout">The card's markup decides where a port sits — not a schema in the library.</p>
  <div class="board-host">
    <FlowBoard onconnect={(c) => (sideLinks = add(sideLinks, c))}>
      <FlowNode id="a" x={80} y={80}>
        <div class="card ports">
          A
          <FlowHandle id="n" class="n" />
          <FlowHandle id="e" class="e" />
          <FlowHandle id="s" class="s" />
          <FlowHandle id="w" class="w" />
        </div>
      </FlowNode>
      <FlowNode id="b" x={380} y={240}>
        <div class="card ports">
          B
          <FlowHandle id="n" class="n" />
          <FlowHandle id="e" class="e" />
          <FlowHandle id="s" class="s" />
          <FlowHandle id="w" class="w" />
        </div>
      </FlowNode>

      {#each sideLinks as link (link.id)}
        <FlowEdge
          from={link.from}
          to={link.to}
          fromHandle={link.fromHandle}
          toHandle={link.toHandle}
        />
      {/each}
    </FlowBoard>
  </div>
</Story>
