import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as studySessionService from '../services/studySession.service.js';

const roomParamsSchema = z.object({
  params: z.object({
    roomId: z.string().min(1, 'ID phòng không được để trống'),
  }),
});

const sessionParamsSchema = z.object({
  params: z.object({
    roomId: z.string().min(1, 'ID phòng không được để trống'),
    sessionId: z.string().min(1, 'ID phiên không được để trống'),
  }),
});

const startBodySchema = z.object({
  body: z.object({
    goal: z.string().trim().max(200).optional(),
  }),
});

/**
 * @openapi
 * /rooms/{roomId}/sessions/start:
 *   post:
 *     tags: [StudySessions]
 *     summary: Bắt đầu phiên học mới
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               goal:
 *                 type: string
 *                 maxLength: 200
 *                 example: 'Học xong chương 3'
 *     responses:
 *       201:
 *         description: Bắt đầu phiên học thành công
 *       400:
 *         description: Tham số không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       409:
 *         description: Đã có phiên học đang hoạt động
 *       404:
 *         description: Không tìm thấy phòng
 */
export const start = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = roomParamsSchema.safeParse({ params: req.params });
    if (!parsedParams.success) {
      return res.status(400).json({
        success: false,
        message: 'Tham số không hợp lệ',
        errorCode: 'VALIDATION_ERROR',
        details: parsedParams.error.flatten().fieldErrors,
      });
    }

    const parsedBody = startBodySchema.safeParse({ body: req.body });
    if (!parsedBody.success) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errorCode: 'VALIDATION_ERROR',
        details: parsedBody.error.flatten().fieldErrors,
      });
    }

    const { roomId } = parsedParams.data.params;
    const { goal } = parsedBody.data.body;
    const userId = req.user!.userId;

    const session = await studySessionService.start(userId, roomId, goal);

    res.status(201).json({
      success: true,
      data: session,
      message: 'Session started',
      errorCode: null,
    });
  } catch (error) {
    if (error instanceof studySessionService.StudySessionError) {
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
 * /rooms/{roomId}/sessions/{sessionId}/pause:
 *   patch:
 *     tags: [StudySessions]
 *     summary: Tạm dừng phiên học
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tạm dừng thành công
 *       400:
 *         description: Tham số không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Không tìm thấy phiên học
 *       409:
 *         description: Phiên học không ở trạng thái chạy
 */
export const pause = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = sessionParamsSchema.safeParse({ params: req.params });
    if (!parsedParams.success) {
      return res.status(400).json({
        success: false,
        message: 'Tham số không hợp lệ',
        errorCode: 'VALIDATION_ERROR',
        details: parsedParams.error.flatten().fieldErrors,
      });
    }

    const { roomId, sessionId } = parsedParams.data.params;
    const userId = req.user!.userId;

    const session = await studySessionService.pause(userId, roomId, sessionId);

    res.status(200).json({
      success: true,
      data: session,
      message: 'Session paused',
      errorCode: null,
    });
  } catch (error) {
    if (error instanceof studySessionService.StudySessionError) {
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
 * /rooms/{roomId}/sessions/{sessionId}/resume:
 *   patch:
 *     tags: [StudySessions]
 *     summary: Tiếp tục phiên học sau khi tạm dừng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tiếp tục thành công
 *       400:
 *         description: Tham số không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Không tìm thấy phiên học
 *       409:
 *         description: Phiên học không ở trạng thái tạm dừng
 */
export const resume = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = sessionParamsSchema.safeParse({ params: req.params });
    if (!parsedParams.success) {
      return res.status(400).json({
        success: false,
        message: 'Tham số không hợp lệ',
        errorCode: 'VALIDATION_ERROR',
        details: parsedParams.error.flatten().fieldErrors,
      });
    }

    const { roomId, sessionId } = parsedParams.data.params;
    const userId = req.user!.userId;

    const session = await studySessionService.resume(userId, roomId, sessionId);

    res.status(200).json({
      success: true,
      data: session,
      message: 'Session resumed',
      errorCode: null,
    });
  } catch (error) {
    if (error instanceof studySessionService.StudySessionError) {
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
 * /rooms/{roomId}/sessions/{sessionId}/finish:
 *   patch:
 *     tags: [StudySessions]
 *     summary: Kết thúc phiên học
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Kết thúc thành công
 *       400:
 *         description: Tham số không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Không tìm thấy phiên học
 *       409:
 *         description: Phiên học không ở trạng thái chạy hoặc tạm dừng
 */
export const finish = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = sessionParamsSchema.safeParse({ params: req.params });
    if (!parsedParams.success) {
      return res.status(400).json({
        success: false,
        message: 'Tham số không hợp lệ',
        errorCode: 'VALIDATION_ERROR',
        details: parsedParams.error.flatten().fieldErrors,
      });
    }

    const { roomId, sessionId } = parsedParams.data.params;
    const userId = req.user!.userId;

    const session = await studySessionService.finish(userId, roomId, sessionId);

    res.status(200).json({
      success: true,
      data: session,
      message: 'Session finished',
      errorCode: null,
    });
  } catch (error) {
    if (error instanceof studySessionService.StudySessionError) {
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
 * /rooms/{roomId}/sessions/current:
 *   get:
 *     tags: [StudySessions]
 *     summary: Lấy phiên học đang hoạt động (nếu có)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Thông tin phiên học hiện tại hoặc null
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Không tìm thấy phòng
 */
export const current = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = roomParamsSchema.safeParse({ params: req.params });
    if (!parsedParams.success) {
      return res.status(400).json({
        success: false,
        message: 'Tham số không hợp lệ',
        errorCode: 'VALIDATION_ERROR',
        details: parsedParams.error.flatten().fieldErrors,
      });
    }

    const { roomId } = parsedParams.data.params;
    const userId = req.user!.userId;

    const session = await studySessionService.current(userId, roomId);

    res.status(200).json({
      success: true,
      data: session,
      message: session ? 'Session found' : 'No active session',
      errorCode: null,
    });
  } catch (error) {
    if (error instanceof studySessionService.StudySessionError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
    }
    next(error);
  }
};
