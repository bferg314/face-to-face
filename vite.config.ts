/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['archdev.local', 'archdev.cobia-rigel.ts.net'],
    host: true,
    port: 5173,
  },
  test: {
    // Scoped deliberately: the default glob would also pick up e2e/*.spec.ts,
    // which imports @playwright/test and cannot run under Vitest.
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
