import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 4000);

const server = createApp().listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
