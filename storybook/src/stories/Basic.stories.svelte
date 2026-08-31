<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { FlowBoard, FlowNode } from 'flowrap';

  const { Story } = defineMeta({
    title: 'FlowBoard/Basic',
    component: FlowBoard,
    parameters: {
      docs: {
        description: {
          component:
            'Wrapper-first: wrap any existing markup in <FlowNode> and it gets a position and dragging. ' +
            'Dragging the background pans the board, the wheel zooms to the cursor.'
        }
      }
    }
  });
</script>

<!--
  Nodes are spread out: all three are absolutely positioned, and piled up
  at (0,0) the last one in the DOM would swallow everyone else's
  pointerdown.
-->
<Story name="Basic" asChild>
  <div class="board-host">
    <FlowBoard>
      <FlowNode id="text" x={40} y={40}>
        <div data-testid="node-text" class="card">Just some text</div>
      </FlowNode>
      <FlowNode id="button" x={40} y={140}>
        <button data-testid="node-button">A button inside a node</button>
      </FlowNode>
      <FlowNode id="image" x={40} y={240}>
        <div data-testid="node-image" class="card">🖼 placeholder image</div>
      </FlowNode>
    </FlowBoard>
  </div>
</Story>
