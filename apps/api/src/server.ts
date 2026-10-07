import { createApp } from './app.js';
import { logger } from './lib/logger.js';

const port = Number(process.env.PORT ?? 4000);

const server = createApp().listen(port, () => {
  logger.info(`API listening on http://localhost:${port}`);
});

const SHUTDOWN_TIMEOUT_MS = 10_000;
let isShuttingDown = false;

const shutdown = (signal: NodeJS.Signals) => {
  if (isShuttingDown) {
    logger.warn(`${signal} received again, forcing exit`);
    process.exit(1);
  }
  isShuttingDown = true;
  logger.info(`${signal} received, shutting down`);

  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Error while closing server');
      process.exit(1);
    }
    process.exit(0);
  });

  setTimeout(() => {
    logger.error(`Shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms, forcing exit`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});
