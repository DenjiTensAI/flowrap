import type { Preview } from '@storybook/svelte-vite';
import './preview.css';

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // The board fills the canvas height: .fr-viewport is height: 100%,
    // and in the padded layout it would collapse to nothing.
    layout: 'fullscreen',
    options: {
      storySort: {
        order: ['Docs', 'Showcase', 'FlowBoard', 'FlowNode', 'FlowEdge', 'FlowHandle']
      }
    }
  }
};

export default preview;
