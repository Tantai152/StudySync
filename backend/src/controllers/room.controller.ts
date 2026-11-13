import { Request, Response, NextFunction } from 'express';
import * as roomService from '../services/room.service.js';

/**
 * @openapi
 * /rooms:
 *   post:
 *     tags: [Rooms]
 *     summary: Tạo phòng học
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Toán cao cấp
 *               description:
 *                 type: string
 *                 example: Phòng họcroup toán cho sinh viên
 *     responses:
 *       201:
 *         description: Tạo phòng thành công
 *       400:
 *         description: Tên phòng không được để trống
 */
export const createRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    const ownerId = req.user!.userId;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Tên phòng không được để trống' });
    }

    const room = await roomService.createRoom(ownerId, name, description);

    res.status(201).json({
      success: true,
      message: 'Tạo phòng thành công',
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /rooms:
 *   get:
 *     tags: [Rooms]
 *     summary: Lấy danh sách phòng của user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách phòng
 */
export const getMyRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const rooms = await roomService.getUserRooms(userId);
    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /rooms/{id}/members:
 *   get:
 *     tags: [Rooms]
 *     summary: Lấy danh sách thành viên phòng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách thành viên
 */
export const getMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: roomId } = req.params;
    const requesterId = req.user!.userId;

    if (typeof roomId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid room ID' });
    }

    const members = await roomService.getRoomMembers(roomId, requesterId);

    res.status(200).json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /rooms/{id}/members:
 *   post:
 *     tags: [Rooms]
 *     summary: Thêm bạn bè vào phòng (chỉ OWNER)
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
 *             required: [userId]
 *             properties:
 *               userId: { type: string, example: 'abc123' }
 *     responses:
 *       201: { description: Thêm thành viên thành công }
 *       403: { description: Không phải bạn bè hoặc không phải OWNER }
 */
export const addMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: roomId } = req.params;
    const { userId } = req.body;
    const ownerId = req.user!.userId;

    if (typeof roomId !== 'string' || typeof userId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid parameters' });
    }

    const result = await roomService.addMember(roomId, ownerId, userId);

    res.status(201).json({
      success: true,
      message: result.alreadyMember
        ? 'Người này đã là thành viên của phòng'
        : 'Thêm thành viên vào phòng thành công',
      data: { roomId, userId, alreadyMember: result.alreadyMember },
    });
  } catch (error) {
    next(error);
  }
};

export const kickMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: roomId, userId: targetUserId } = req.params;
    const ownerId = req.user!.userId;

    if (typeof roomId !== 'string' || typeof targetUserId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid parameters' });
    }

    await roomService.kickMember(roomId, ownerId, targetUserId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const leaveRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: roomId } = req.params;
    const userId = req.user!.userId;

    if (typeof roomId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid room ID' });
    }

    await roomService.leaveRoom(roomId, userId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const deleteRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: roomId } = req.params;
    const ownerId = req.user!.userId;

    if (typeof roomId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid room ID' });
    }

    await roomService.deleteRoom(roomId, ownerId);

    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && (error as Error & { statusCode?: number }).statusCode) {
      return res
        .status((error as Error & { statusCode: number }).statusCode!)
        .json({ success: false, message: error.message });
    }
    next(error);
  }
};