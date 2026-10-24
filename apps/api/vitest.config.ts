import { defineConfig } from 'vitest/config';

// Local test credentials (same as docker-compose), not secrets
export const TEST_DATABASE_URL =
  'postgresql://flock_admin:flock_dev@localhost:5432/flock_test?schema=public';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: TEST_DATABASE_URL,
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: 'test-secret-at-least-32-characters-long',
    },
    // Runs once before all test files: resets the test DB and applies migrations
    globalSetup: './tests/global-setup.ts',
    // All files share one database
    fileParallelism: false,
  },
});
