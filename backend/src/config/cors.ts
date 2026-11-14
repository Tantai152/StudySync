import type { CorsOptions } from 'cors';
import { env } from './env.js';

/**
 * FRONTEND_URL có thể chứa nhiều origin, phân tách bằng dấu phẩy.
 * Ví dụ: https://studywithme.io.vn,https://study-sync-gilt-ten.vercel.app
 */
const normalizeOrigin = (value: string): string => value.trim().replace(/\/+$/, '');

export const allowedOrigins = env.FRONTEND_URL.split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

/**
 * Dùng chung cho Express và Socket.IO để tránh lệch cấu hình.
 * Origin header không bao giờ có dấu "/" ở cuối, nên phải normalize trước khi so sánh.
 */
export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Request không có Origin (curl, health check, same-origin) luôn được phép.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(normalizeOrigin(origin))) {
      callback(null, true);
      return;
    }

    console.warn(`⚠️  Blocked CORS origin: ${origin} (allowed: ${allowedOrigins.join(', ')})`);
    callback(null, false);
  },
  credentials: true,
};
