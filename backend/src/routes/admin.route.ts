import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

export const adminRouter = Router();

adminRouter.get(
  '/dashboard',
  authenticate,
  authorize('ADMIN'),
  (_req, res) => {
    res.status(200).json({
      success: true,
      data: { message: 'Chào mừng admin đến với dashboard' },
    });
  }
);