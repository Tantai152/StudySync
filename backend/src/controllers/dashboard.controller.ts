import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service.js';

/**
 * @openapi
 * /dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Lấy thống kê tổng quan (số phòng, bạn bè, tổng thời gian học)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê tổng quan
 *       401:
 *         description: Chưa đăng nhập
 */
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const stats = await dashboardService.getUserStats(userId);
    
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /dashboard/study-stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Lấy thống kê học tập chi tiết (theo ngày/tuần/tháng)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê học tập chi tiết
 *       401:
 *         description: Chưa đăng nhập
 */
export const getStudyStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const stats = await dashboardService.getStudyStats(userId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};