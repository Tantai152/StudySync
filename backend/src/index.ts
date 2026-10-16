import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 StudySync API listening on http://localhost:${env.PORT}`);
  console.log(`   Env: ${env.NODE_ENV}`);
});

const shutdown = (signal: string) => {
  console.log(`\n${signal} received, shutting down...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));