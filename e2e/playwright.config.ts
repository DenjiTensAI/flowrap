import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', // relative to this file, i.e. e2e/
  webServer: {
    command: 'pnpm --filter playground preview',
    port: 4173,
    reuseExistingServer: !process.env.CI
  },
  use: { baseURL: 'http://localhost:4173' }
});
