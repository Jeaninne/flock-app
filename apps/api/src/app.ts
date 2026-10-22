import express from 'express';
import cookieParser from 'cookie-parser';
import { isDev } from './lib/env.js';
import { httpLogger } from './lib/http-logger.js';
import { notFoundHandler } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';

export const createApp = () => {
  const app = express();

  app.set('env', isDev ? 'development' : 'production');
  app.disable('x-powered-by');
  app.use(httpLogger);
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/auth', authRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
