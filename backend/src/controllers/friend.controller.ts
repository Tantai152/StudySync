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

export const getRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const requests = await friendService.getPendingRequests(userId);
    res.status(200).json({ success: true, data: requests });
  } catch (error) { 
    next(error); 
  }
};

export const respondRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { action } = req.body; // 'accept' hoặc 'reject'
    const userId = req.user!.userId;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action không hợp lệ' });
    }

    // ĐÃ SỬA DÒNG DƯỚI ĐÂY:
    const result = await friendService.respondToRequest(id, userId, action as 'accept' | 'reject');
    
    res.status(200).json({ success: true, message: `Đã ${action === 'accept' ? 'chấp nhận' : 'từ chối'} lời mời`, data: result });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const getFriends = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const friends = await friendService.getFriendsList(userId);
    res.status(200).json({ success: true, data: friends });
  } catch (error) { 
    next(error); 
  }
};