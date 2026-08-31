<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { FlowBoard } from 'flowrap';
  import PipelineBoard from './showcase/PipelineBoard.svelte';

  const { Story } = defineMeta({
    title: 'Showcase/Order pipeline',
    component: FlowBoard,
    parameters: {
      docs: {
        description: {
          component:
            'The whole library on one screen: node dragging, zoom/pan to the cursor, ' +
            'three edge shapes, ports and mouse-dragged connections, `isValidConnection`, ' +
            '`bind:zoom` / `bind:pan` / `bind:positions`, `disabled`, and the `screenToFlow` helper. ' +
            'Cards, grid and ports are ordinary markup in this demo: the library knows nothing about ' +
            'node types or how they look, and the graph lives entirely in the demo\'s own state.'
        }
      }
    }
  });
</script>

<!--
  asChild is mandatory: without it <Story> wraps the content in the
  component from defineMeta and you end up with a second, nested board.
-->
<Story name="Light theme" exportName="Light" asChild>
  <PipelineBoard />
</Story>

<Story name="Dark theme" exportName="Dark" asChild>
  <PipelineBoard theme="dark" />
</Story>
