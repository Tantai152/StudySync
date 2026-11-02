import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js'; // Giữ nguyên đường dẫn import client của bạn
import { env } from './env.js';

const adapter = new PrismaMariaDb({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  allowPublicKeyRetrieval: true,
  
  // 1. Tăng thời gian chờ lên 30 giây (Fix lỗi timeout 802ms)
  connectTimeout: 30000, 
  
  // 2. Bỏ qua xác thực chứng chỉ (Dành cho Dev)
  ssl: {
    rejectUnauthorized: false,
  },
});

export const prisma = new PrismaClient({ adapter });
