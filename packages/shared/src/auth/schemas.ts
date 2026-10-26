import { z } from 'zod';
import { emailSchema } from '../common/fields.js';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './constants.js';

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: 'validation.password.required' })
    .min(1, { error: 'validation.password.required' }),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const setPasswordSchema = z.object({
  token: z
    .string({ error: 'validation.token.required' })
    .min(1, { error: 'validation.token.required' }),
  password: z
    .string({ error: 'validation.password.required' })
    .min(PASSWORD_MIN_LENGTH, { error: 'validation.password.tooShort' })
    .refine((p) => new TextEncoder().encode(p).length <= PASSWORD_MAX_LENGTH, {
      error: 'validation.password.tooLong',
    }),
});

export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
