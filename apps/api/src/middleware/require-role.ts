import type { RequestHandler } from 'express';
import { AppError } from '../lib/app-error.js';
import type { User } from '../generated/prisma/client.js';
import { getAuth } from './require-auth.js';

export const requireRole =
  (...roles: User['role'][]): RequestHandler =>
  (req, _res, next) => {
    const { role } = getAuth(req);
    if (!roles.includes(role)) {
      throw new AppError('FORBIDDEN', 'Access denied');
    }

    next();
  };
