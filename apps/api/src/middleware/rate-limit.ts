import { rateLimit } from 'express-rate-limit';
import { AppError } from '../lib/app-error.js';

type AuthLimiterOptions = {
  windowMinutes?: number;
  limit?: number;
  skipSuccessfulRequests?: boolean;
};

const createAuthLimiter = ({
  windowMinutes = 15,
  limit = 10,
  skipSuccessfulRequests = false,
}: AuthLimiterOptions = {}) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (_req, _res, next) => {
      next(new AppError('TOO_MANY_REQUESTS', 'Too many requests'));
    },
  });

export const loginLimiter = createAuthLimiter({ skipSuccessfulRequests: true });
export const refreshLimiter = createAuthLimiter({ limit: 60 });
