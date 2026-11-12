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
