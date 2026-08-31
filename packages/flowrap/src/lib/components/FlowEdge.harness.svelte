<script lang="ts">
  import FlowBoard from './FlowBoard.svelte';
  import FlowNode from './FlowNode.svelte';
  import FlowEdge from './FlowEdge.svelte';
  import FlowHandle from './FlowHandle.svelte';
  import type { EdgePathType } from '../types';

  let {
    to = 'b',
    type = 'bezier',
    duplicate = false,
    withHandles = false
  }: {
    to?: string;
    type?: EdgePathType;
    duplicate?: boolean;
    withHandles?: boolean;
  } = $props();
</script>

<FlowBoard>
  <FlowNode id="a" x={0} y={0}>
    <div data-testid="node-a">
      A
      {#if withHandles}<FlowHandle id="out" type="source" />{/if}
    </div>
  </FlowNode>
  <FlowNode id="b" x={200} y={100}>
    <div data-testid="node-b">
      B
      {#if withHandles}<FlowHandle id="in" type="target" />{/if}
    </div>
  </FlowNode>

  {#if withHandles}
    <FlowEdge from="a" {to} {type} fromHandle="out" toHandle="in" />
  {:else}
    <FlowEdge from="a" {to} {type} />
  {/if}
  {#if duplicate}
    <FlowEdge from="a" {to} {type} />
  {/if}
</FlowBoard>
