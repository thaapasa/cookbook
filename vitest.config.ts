import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const env = loadEnv('test', process.cwd(), '');
const devUrl = env.DATABASE_URL ?? 'postgres://cookbook:cookbook@localhost:15432/cookbook';

// The tests use a separate database next to the development database.
const testUrl = new URL(devUrl);
testUrl.pathname = `${testUrl.pathname}_test`;

export default defineConfig({
  test: {
    include: ['src/server/**/*.test.ts', 'src/shared/**/*.test.ts', 'src/client/**/*.test.ts'],
    environment: 'node',
    env: {
      DATABASE_URL: testUrl.href,
      IMAGES_DIR: 'data/test-images',
      PUBLIC_URL: 'https://reseptit.example',
    },
    globalSetup: ['src/server/test/global-setup.ts'],
    // The test files share one database.
    fileParallelism: false,
  },
});
