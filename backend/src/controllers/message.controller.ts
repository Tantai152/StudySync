import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as messageService from '../services/message.service.js';

// Schema validate params roomId
const roomIdParamsSchema = z.object({
  params: z.object({
    roomId: z.string().cuid('ID phòng không hợp lệ'),
  }),
});

// Schema validate query params (cursor pagination)
const messagesQuerySchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(100).optional().default(50),
  }),
});

// Schema validate body gửi tin nhắn
const sendMessageBodySchema = z.object({
  body: z.object({
    content: z
      .string()
      .min(1, 'Nội dung tin nhắn không được để trống')
      .max(1000, 'Nội dung tin nhắn tối đa 1000 ký tự'),
    clientId: z.string().optional(),
  }),
});

/**
 * GET /api/v1/rooms/:roomId/messages
 * Lấy lịch sử chat (cursor pagination, ASC).
 */
export const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validate params
    const parsedParams = roomIdParamsSchema.safeParse({ params: req.params });
    if (!parsedParams.success) {
      return res.status(400).json({
        success: false,
        message: 'ID phòng không hợp lệ',
        errorCode: 'VALIDATION_ERROR',
        details: parsedParams.error.flatten().fieldErrors,
      });
    }

    // Validate query
    const parsedQuery = messagesQuerySchema.safeParse({ query: req.query });
    if (!parsedQuery.success) {
      return res.status(400).json({
        success: false,
        message: 'Tham số truy vấn không hợp lệ',
        errorCode: 'VALIDATION_ERROR',
        details: parsedQuery.error.flatten().fieldErrors,
      });
    }

    const { roomId } = parsedParams.data.params;
    const userId = req.user!.userId;

    const { cursor, limit } = parsedQuery.data.query;

    const messages = await messageService.getMessages(
      roomId,
      userId,
      cursor,
      limit
    );

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/rooms/:roomId/messages
 * Gửi tin nhắn mới.
 */
export const createMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validate params + body
    const parsedParams = roomIdParamsSchema.safeParse({ params: req.params });
    if (!parsedParams.success) {
      return res.status(400).json({
        success: false,
        message: 'ID phòng không hợp lệ',
        errorCode: 'VALIDATION_ERROR',
        details: parsedParams.error.flatten().fieldErrors,
      });
    }

    const parsedBody = sendMessageBodySchema.safeParse({ body: req.body });
    if (!parsedBody.success) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errorCode: 'VALIDATION_ERROR',
        details: parsedBody.error.flatten().fieldErrors,
      });
    }

    const { roomId } = parsedParams.data.params;
    const { content, clientId } = parsedBody.data.body;
    const userId = req.user!.userId;

    const message = await messageService.createMessage(
      roomId,
      userId,
      content,
      clientId
    );

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};
