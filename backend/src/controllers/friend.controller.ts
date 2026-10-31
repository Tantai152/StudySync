import { Request, Response, NextFunction } from 'express';
import * as friendService from '../services/friend.service.js';

export const searchUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.query as string;
    const currentUserId = req.user!.userId; // Lấy từ middleware authenticate

    const users = await friendService.searchUsers(query, currentUserId);

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const sendFriendRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user!.userId;

    const request = await friendService.sendFriendRequest(senderId, receiverId);

    res.status(201).json({
      success: true,
      message: 'Gửi lời mời kết bạn thành công',
      data: request,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        errorCode: 'FRIEND_REQUEST_ERROR',
      });
    }
    next(error);
  }
};