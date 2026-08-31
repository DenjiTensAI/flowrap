import type { Preview } from '@storybook/svelte-vite';
import './preview.css';

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // The board fills the canvas height: .fr-viewport is height: 100%,
    // and in the padded layout it would collapse to nothing.
    layout: 'fullscreen',
    // Off by default in addon-docs. On the public Storybook the story source
    // is the actual documentation, so the panel earns its place.
    docs: { codePanel: true },
    options: {
      storySort: {
        order: ['Docs', 'Showcase', 'FlowBoard', 'FlowNode', 'FlowEdge', 'FlowHandle']
      }
    }
  }
};

export default preview;
