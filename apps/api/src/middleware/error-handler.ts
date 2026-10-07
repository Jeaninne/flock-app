import type { ErrorRequestHandler } from 'express';
import { AppError, type ErrorCode } from '../lib/app-error.js';
import { isDev } from '../lib/env.js';

type HttpError = Error & { status: number; expose?: boolean; type?: string };

const isClientHttpError = (err: unknown): err is HttpError =>
  err instanceof Error &&
  'status' in err &&
  typeof err.status === 'number' &&
  err.status >= 400 &&
  err.status < 500;

const codeByStatus: Partial<Record<number, ErrorCode>> = {
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
};

const clientMessage = (err: HttpError) => {
  if (err.type === 'entity.parse.failed') return 'Malformed JSON body';
  return err.expose ? err.message : 'Bad request';
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    if (err.status >= 500) res.err = err;
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (isClientHttpError(err)) {
    res.status(err.status).json({
      error: { code: codeByStatus[err.status] ?? 'BAD_REQUEST', message: clientMessage(err) },
    });
    return;
  }

  res.err = err;
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isDev ? String(err?.message ?? err) : 'Something went wrong',
    },
  });
};
