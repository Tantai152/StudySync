import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DB_HOST: z.string().default('mysql'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().default('studysync'),
  DB_PASSWORD: z.string().default('studysync'),
  DB_NAME: z.string().default('studysync'),
  FRONTEND_URL: z
    .string()
    .default('http://localhost:5173')
    .refine(
      (val) => {
        if (process.env.NODE_ENV === 'production') {
          return val !== 'http://localhost:5173';
        }
        return true;
      },
      {
        message:
          'FRONTEND_URL phải được cấu hình đúng khi NODE_ENV=production (không được dùng default localhost)',
      }
    ),
  
  // Đã xóa JWT_SECRET và JWT_EXPIRES_IN thừa thãi
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;