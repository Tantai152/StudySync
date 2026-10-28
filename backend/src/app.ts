import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.route.js';
import { authRouter } from './routes/auth.route.js';
import cookieParser from 'cookie-parser';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cookieParser());

  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/auth', authRouter);

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      message: 'Not found',
      errorCode: 'NOT_FOUND',
    });
  });

  return app;
}