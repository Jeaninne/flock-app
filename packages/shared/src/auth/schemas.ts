import { z } from 'zod';
import { emailSchema } from '../common/fields.js';

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: 'validation.password.required' })
    .min(1, { error: 'validation.password.required' }),
});

export type LoginInput = z.infer<typeof loginSchema>;
