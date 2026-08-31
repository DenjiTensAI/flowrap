import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// @storybook/svelte-vite does NOT add vite-plugin-svelte itself — it
// expects the project's vite config to bring it. Without this file even
// Storybook's own PreviewRender.svelte dies with "Unexpected JSX
// expression": rolldown tries to parse a raw <script> as JS.
export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        // Same runes forcing as the playground: libraries stay as they are.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true
      }
    })
  ]
});
