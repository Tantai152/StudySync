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
 * GET /api/v1/rooms/:roomId/summary
 * Trả về bản tóm tắt mới nhất của phòng (null nếu chưa có).
 * Yêu cầu đăng nhập và là thành viên của phòng.
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
 * GET /api/v1/users/me/summaries
 * Trả về danh sách 10 bản tóm tắt mới nhất của tất cả các phòng
 * mà user hiện tại là thành viên.
 * Yêu cầu đăng nhập.
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
