import type { RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../lib/app-error.js';

export const validateBody =
  (schema: z.ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      throw new AppError('VALIDATION_ERROR', 'Invalid request body', z.flattenError(result.error));
    }

    // Parsed data: unknown keys removed, transforms and defaults applied
    req.body = result.data;
    next();
  };
