import { z } from 'zod';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@flock/shared/dist';

// TODO migrate rest in #13
export const setPasswordSchema = z
  .object({
    email: z.string(), // TODO check if we need this field
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, 'validation.password.minLength')
      .max(PASSWORD_MAX_LENGTH, 'validation.password.maxLength'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: 'validation.password.notMatch',
    path: ['confirmPassword'],
  });

export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
