import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const env = loadEnv('test', process.cwd(), '');
const devUrl = env.DATABASE_URL ?? 'postgres://cookbook:cookbook@localhost:15432/cookbook';

// Server tests use a separate database next to the development database.
const testUrl = new URL(devUrl);
testUrl.pathname = `${testUrl.pathname}_test`;

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'server',
          include: ['src/server/**/*.test.ts', 'src/shared/**/*.test.ts'],
          environment: 'node',
          env: { DATABASE_URL: testUrl.href, IMAGES_DIR: 'data/test-images' },
          globalSetup: ['src/server/test/global-setup.ts'],
          // The test files share one database.
          fileParallelism: false,
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'client',
          include: ['src/client/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['src/client/test/setup.ts'],
        },
      },
    ],
  },
});
