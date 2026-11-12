import { Request, Response, NextFunction } from 'express';
import * as roomService from '../services/room.service.js';

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

export const getMyRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const rooms = await roomService.getUserRooms(userId);
    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
};