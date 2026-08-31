import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import svelteConfig from './svelte.config.js';

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    }
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
        svelteConfig
      }
    }
  },
  {
    // Reactivity tests subscribe with a bare read (`ctx.nodes.size;`).
    // That's the point of the line, not leftover junk.
    files: ['**/*.test.ts', '**/*.svelte.test.ts'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off'
    }
  },
  {
    ignores: ['dist/', 'node_modules/', '.svelte-kit/']
  }
);
