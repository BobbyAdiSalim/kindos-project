import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 15000,
    coverage: {
      exclude: [
        'tests/**',
        '**/*.test.js',
        '**/*.spec.js',
        'routes/**',
        '**/services/**/index.js',
        'models/index.js',
      ],
    },
  },
});
