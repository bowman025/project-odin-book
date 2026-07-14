import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    pool: 'forks',
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
    },
    setupFiles: ['./tests/setup.ts'],
  },
});
