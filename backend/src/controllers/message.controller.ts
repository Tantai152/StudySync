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
 * @openapi
 * /rooms/{roomId}/messages:
 *   get:
 *     tags: [Messages]
 *     summary: Lấy lịch sử chat (cursor pagination, ASC)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *         description: Cursor cho pagination
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 50 }
 *     responses:
 *       200:
 *         description: Danh sách tin nhắn
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Không tìm thấy phòng
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
 * @openapi
 * /rooms/{roomId}/messages:
 *   post:
 *     tags: [Messages]
 *     summary: Gửi tin nhắn mới
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
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 1000
 *                 example: 'Xin chào mọi người!'
 *               clientId:
 *                 type: string
 *                 description: ID idempotency từ client
 *     responses:
 *       201:
 *         description: Gửi tin nhắn thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Không tìm thấy phòng
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
