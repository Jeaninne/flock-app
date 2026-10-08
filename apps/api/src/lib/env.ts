import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
});

// Treat empty values (`PORT=` in .env, `${VAR}` of an unset var in docker-compose) as unset,
// so defaults apply instead of failing validation
const definedEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value?.trim() !== ''),
);

const parsed = EnvSchema.safeParse(definedEnv);

if (!parsed.success) {
  console.error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

export const env = parsed.data;
export const isDev = env.NODE_ENV === 'development';
