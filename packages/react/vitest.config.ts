import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      // Focus coverage on library source; exclude examples and tests themselves
      include: ['src/**/*.ts'],
      exclude: ['tests/**'],
      // Enforce minimum coverage thresholds
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
