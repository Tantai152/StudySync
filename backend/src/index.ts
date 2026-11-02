import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { setupSocket } from './sockets/socket.js';

const app = createApp();

// Tạo HTTP server từ app Express
const server = createServer(app);

// Khởi tạo Socket.IO và cấu hình CORS
const io = new Server(server, {
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
  },
});

// Kích hoạt Socket logic
setupSocket(io);

// Chạy server
server.listen(env.PORT, () => {
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