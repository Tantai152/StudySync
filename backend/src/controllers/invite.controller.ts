import { Request, Response, NextFunction } from 'express';
import * as inviteService from '../services/invite.service.js';

export const createInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roomId = req.params.id as string;
    const ownerId = req.user!.userId;

    const invite = await inviteService.generateInviteLink(roomId, ownerId);

    // Tạo đường link hoàn chỉnh để Frontend có thể copy
    const inviteLink = `http://localhost:5173/join?token=${invite.token}`;

    res.status(201).json({
      success: true,
      message: 'Tạo link mời thành công',
      data: {
        link: inviteLink,
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