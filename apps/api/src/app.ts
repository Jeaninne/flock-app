import express from 'express';
import { healthRouter } from './routes/health.js';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/api/v1/health', healthRouter);

  return app;
};
