import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5200',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npx vite --port 5200 --strictPort',
    url: 'http://localhost:5200',
    reuseExistingServer: !process.env.CI,
  },
});
