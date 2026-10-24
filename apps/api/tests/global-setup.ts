import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from '../vitest.config.js';

export default function setup() {
  execSync('pnpm exec prisma migrate reset --force', {
    cwd: new URL('..', import.meta.url), // apps/api, where prisma.config.ts lives
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
