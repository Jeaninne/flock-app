import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from './logger.js';

const REQUEST_ID_HEADER = 'x-request-id';
// Accept client-supplied IDs only in a safe shape, so they can't inject junk into logs
const VALID_REQUEST_ID = /^[\w-]{1,128}$/;

export const httpLogger = pinoHttp<Request, Response>({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const id =
      typeof incoming === 'string' && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader(REQUEST_ID_HEADER, id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res, responseTime) =>
    `${req.method} ${req.originalUrl} ${res.statusCode} ${Math.round(responseTime)}ms`,
  customErrorMessage: (req, res) => `${req.method} ${req.originalUrl} ${res.statusCode}`,
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
