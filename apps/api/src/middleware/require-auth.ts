import type { RequestHandler } from 'express';
import { AppError } from '../lib/app-error.js';
import { verifyAccessToken } from '../lib/tokens.js';

const PREFIX = 'bearer ';
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith(PREFIX)) {
    throw new AppError('UNAUTHORIZED', 'Invalid access token');
  }

  const token = authHeader.slice(PREFIX.length);
  try {
    req.auth = await verifyAccessToken(token);
  } catch {
    throw new AppError('UNAUTHORIZED', 'Invalid access token');
  }

  next();
};
