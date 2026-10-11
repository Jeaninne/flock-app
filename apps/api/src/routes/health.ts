import { Router } from 'express';
import pkg from '../../package.json' with { type: 'json' };
import { prisma } from '../lib/prisma.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    version: pkg.version,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    req.log.error({ err }, 'Database is unreachable');
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});
