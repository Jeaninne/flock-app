import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ error: 'validation.email.required' })
    .trim()
    .toLowerCase()
    .max(254, 'validation.email.length')
    .pipe(z.email('validation.email.wrongFormat')),
  password: z
    .string({ error: 'validation.password.required' })
    .min(1, 'validation.password.required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
