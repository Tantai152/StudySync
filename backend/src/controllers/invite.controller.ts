import { Request, Response, NextFunction } from 'express';
import * as inviteService from '../services/invite.service.js';

/**
 * @openapi
 * /rooms/{id}/invites:
 *   post:
 *     tags: [Invites]
 *     summary: Tạo link mời vào phòng (chỉ OWNER)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Tạo link mời thành công
 *       403:
 *         description: Không phải OWNER
 *       404:
 *         description: Không tìm thấy phòng
 */
export const createInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roomId = req.params.id as string;
    const ownerId = req.user!.userId;

    const invite = await inviteService.generateInviteLink(roomId, ownerId);

    // Trả về token; Frontend tự ghép link theo domain đang truy cập (window.location.origin)
    res.status(201).json({
      success: true,
      message: 'Tạo link mời thành công',
      data: {
        token: invite.token,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * @openapi
 * /rooms/join:
 *   post:
 *     tags: [Invites]
 *     summary: Tham gia phòng qua token mời
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 example: 'abc123xyz'
 *     responses:
 *       200:
 *         description: Tham gia phòng thành công
 *       400:
 *         description: Token không hợp lệ
 *       404:
 *         description: Token hết hạn hoặc không tồn tại
 *       409:
 *         description: Phòng đã đầy
 */
export const joinRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { token } = req.body as { token?: string };

    if (typeof token !== 'string' || token.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Token mời không hợp lệ',
        errorCode: 'VALIDATION_ERROR',
      });
    }

    const result = await inviteService.joinRoomByToken(userId, token.trim());

    res.status(200).json({
      success: true,
      message: 'Tham gia phòng thành công',
      data: result,
    });
  } catch (error) {
    if (error instanceof inviteService.InviteError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
    }
    next(error);
  }
};