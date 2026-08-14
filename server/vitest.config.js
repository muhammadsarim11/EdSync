import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    hookTimeout: 300000,
    testTimeout: 20000,
    fileParallelism: false
  }
});
