<script lang="ts">
  import { FlowBoard, FlowEdge, FlowHandle, FlowNode } from 'flowrap';

  type Link = {
    id: string;
    from: string;
    to: string;
    fromHandle?: string;
    toHandle?: string;
  };

  // The library does NOT create edges: a drag ends in an onconnect call,
  // and what to do with the connection is up to the consumer.
  let links = $state<Link[]>([]);
  let rejectAll = $state(false);
</script>

<label>
  <input type="checkbox" data-testid="reject" bind:checked={rejectAll} />
  Reject every connection
</label>
<pre data-testid="links-json">{JSON.stringify(links, null, 2)}</pre>

<div class="board-host">
  <FlowBoard
    isValidConnection={() => !rejectAll}
    onconnect={(c) => (links = [...links, { id: crypto.randomUUID(), ...c }])}
  >
    <!-- Nodes are spread out on purpose: stacked on one spot, the last
         one in the DOM swallows pointerdown. -->
    <FlowNode id="a" x={60} y={60}>
      <div data-testid="node-a" class="card">
        A <FlowHandle id="out" type="source" />
      </div>
    </FlowNode>

    <FlowNode id="b" x={380} y={200}>
      <div data-testid="node-b" class="card">
        <FlowHandle id="in" type="target" /> B
      </div>
    </FlowNode>

    <!-- C has two ports pointing opposite ways: a drop on "out" must
         fall back to "in" instead of rejecting the connection. -->
    <FlowNode id="c" x={60} y={320}>
      <div data-testid="node-c" class="card">
        <FlowHandle id="in" type="target" /> C <FlowHandle id="out" type="source" />
      </div>
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

<style>
  /*
   * Fixed height rather than auto: the list grows after every drop, which
   * would push the board down the page — and an e2e test that grabbed a
   * boundingBox before the drag would then compare two different layouts.
   */
  pre {
    height: 6em;
    margin: 8px 12px;
    padding: 4px 8px;
    overflow: auto;
    background: #f4f4f4;
    border: 1px solid #ddd;
  }
</style>
