import { Router } from 'express';
import pkg from '../../package.json' with { type: 'json' };

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    version: pkg.version,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
