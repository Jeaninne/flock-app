import type { RequestHandler } from 'express';
import { AppError } from '../lib/app-error.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError('NOT_FOUND', `Route ${req.method} ${req.path} not found`));
};
