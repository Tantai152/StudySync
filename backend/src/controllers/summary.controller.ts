import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  getLatestSummary,
  getRoomSummariesByUser,
  SummaryError,
} from '../services/summary.service.js';

const paramsSchema = z.object({
  roomId: z.string().cuid('ID phòng không hợp lệ'),
});

/**
 * @openapi
 * /rooms/{roomId}/summary:
 *   get:
 *     tags: [Summary]
 *     summary: Lấy bản tóm tắt mới nhất của phòng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bản tóm tắt phòng (null nếu chưa có)
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Không tìm thấy phòng hoặc không phải thành viên
 */
export const getRoomSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = paramsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({
        success: false,
        message: 'ID phòng không hợp lệ',
        errorCode: 'VALIDATION_ERROR',
        details: parsedParams.error.flatten().fieldErrors,
      });
    }

    const { roomId } = parsedParams.data;
    const userId = req.user!.userId;

    const summary = await getLatestSummary(roomId, userId);

    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    if (error instanceof SummaryError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
    }

    next(error);
  }
};

/**
 * @openapi
 * /users/me/summaries:
 *   get:
 *     tags: [Summary]
 *     summary: Lấy danh sách 10 bản tóm tắt mới nhất của user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách bản tóm tắt
 *       401:
 *         description: Chưa đăng nhập
 */
export const getUserSummaries = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const summaries = await getRoomSummariesByUser(userId, 10);

    res.status(200).json({ success: true, data: summaries });
  } catch (error) {
    next(error);
  }
};
