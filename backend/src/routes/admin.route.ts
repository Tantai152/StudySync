import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

/**
 * @openapi
 * /admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Dashboard quản trị (chỉ ADMIN)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chào mừng admin
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền ADMIN
 */
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