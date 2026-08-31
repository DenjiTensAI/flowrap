<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { FlowBoard, FlowNode } from 'flowrap';

  const { Story } = defineMeta({
    title: 'FlowBoard/Zoom limits',
    component: FlowBoard,
    args: { minZoom: 0.5, maxZoom: 1.5, zoomSpeed: 0.002 },
    argTypes: {
      minZoom: { control: { type: 'number', step: 0.1 } },
      maxZoom: { control: { type: 'number', step: 0.1 } },
      zoomSpeed: { control: { type: 'number', step: 0.001 } }
    },
    parameters: {
      docs: {
        description: {
          component:
            'The wheel zooms to the cursor: the world point under it stays put on screen. ' +
            'The value is clamped to [minZoom, maxZoom].'
        }
      }
    }
  });
</script>

<script lang="ts">
  let zoom = $state(1);
</script>

<Story name="Zoom limits" exportName="ZoomLimits">
  {#snippet template(args)}
    <p class="readout" data-testid="zoom-readout">{Math.round(zoom * 100)}%</p>

    <div class="board-host">
      <FlowBoard bind:zoom minZoom={args.minZoom} maxZoom={args.maxZoom} zoomSpeed={args.zoomSpeed}>
        <FlowNode id="a" x={40} y={40}><div class="card">A</div></FlowNode>
      </FlowBoard>
    </div>
  {/snippet}
</Story>
