import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts', 'packages/*/tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['apps/backend-server/src/**'],
    },
  },
});
