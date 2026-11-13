import { Request, Response, NextFunction } from 'express';
import * as inviteService from '../services/invite.service.js';

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