import { z } from 'zod';
import { emailSchema, stringRequired } from '../common/fields.js';
import { USER_ROLES } from './constants.js';

export const inviteUserSchema = z
  .object({
    email: emailSchema,
    name: stringRequired(100),
    role: z.enum(USER_ROLES, { error: 'validation.role.invalid' }),
    dispatcherId: z.uuid({ error: 'validation.dispatcherId.invalid' }).optional(),
  })
  .refine((data) => data.role === 'COURIER' || data.dispatcherId === undefined, {
    error: 'validation.dispatcherId.couriersOnly',
    path: ['dispatcherId'],
  });

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
