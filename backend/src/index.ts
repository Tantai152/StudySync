import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { setupSocket } from './sockets/socket.js';
import { registerVoiceNamespace } from './socket/voice.socket.js';

const app = createApp();

// Tạo HTTP server từ app Express
const server = createServer(app);

// Khởi tạo Socket.IO và cấu hình CORS
const io = new Server(server, {
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Kích hoạt Socket logic
setupSocket(io);

// Kích hoạt Voice namespace (/voice)
registerVoiceNamespace(io);

// Chạy server
server.listen(env.PORT, '0.0.0.0', () => {
  console.log(`🚀 StudySync API listening on http://0.0.0.0:${env.PORT}`);
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