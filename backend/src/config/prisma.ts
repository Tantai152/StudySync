import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { env } from './env.js';

const adapter = new PrismaMariaDb({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: {
    rejectUnauthorized: false, // Bắt buộc để kết nối Aiven Cloud không bị chặn SSL
  },
  // Aiven TLS handshakes can exceed mariadb's 1s default, causing
  // "pool failed to retrieve a connection from pool" on cold starts.
  connectTimeout: 15000,
});

export const prisma = new PrismaClient({ adapter });