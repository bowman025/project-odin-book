import path from 'node:path';
import dotenv from 'dotenv';
import { configDefaults, defineConfig } from 'vitest/config';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

export default defineConfig({
  test: {
    globals: true,
    pool: 'forks',
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
    },
    setupFiles: ['./tests/setup.ts'],
    reporters: ['verbose'],
    exclude: [...configDefaults.exclude],
  },
});
