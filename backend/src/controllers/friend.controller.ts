import { Request, Response, NextFunction } from 'express';
import * as friendService from '../services/friend.service.js';

/**
 * @openapi
 * /friends/users:
 *   get:
 *     tags: [Friends]
 *     summary: Tìm kiếm user để kết bạn
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema: { type: string }
 *         description: Từ khóa tìm kiếm (email hoặc tên)
 *     responses:
 *       200:
 *         description: Danh sách user phù hợp
 *       401:
 *         description: Chưa đăng nhập
 */
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

/**
 * @openapi
 * /friends/friend-requests:
 *   post:
 *     tags: [Friends]
 *     summary: Gửi lời mời kết bạn
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [receiverId]
 *             properties:
 *               receiverId:
 *                 type: string
 *                 example: 'abc123'
 *     responses:
 *       201:
 *         description: Gửi lời mời thành công
 *       400:
 *         description: Đã gửi lời mời / đã là bạn bè / không thể tự kết bạn
 *       404:
 *         description: Không tìm thấy user
 */
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

/**
 * @openapi
 * /friends/friend-requests:
 *   get:
 *     tags: [Friends]
 *     summary: Lấy danh sách lời mời kết bạn đang chờ
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách lời mời
 *       401:
 *         description: Chưa đăng nhập
 */
export const getRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const requests = await friendService.getPendingRequests(userId);
    res.status(200).json({ success: true, data: requests });
  } catch (error) { 
    next(error); 
  }
};

/**
 * @openapi
 * /friends/friend-requests/{id}:
 *   patch:
 *     tags: [Friends]
 *     summary: Chấp nhận hoặc từ chối lời mời kết bạn
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, reject]
 *     responses:
 *       200:
 *         description: Xử lý lời mời thành công
 *       400:
 *         description: Action không hợp lệ
 *       404:
 *         description: Không tìm thấy lời mời
 */
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

/**
 * @openapi
 * /friends/friends:
 *   get:
 *     tags: [Friends]
 *     summary: Lấy danh sách bạn bè
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách bạn bè
 *       401:
 *         description: Chưa đăng nhập
 */
export const getFriends = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const friends = await friendService.getFriendsList(userId);
    res.status(200).json({ success: true, data: friends });
  } catch (error) { 
    next(error); 
  }
};