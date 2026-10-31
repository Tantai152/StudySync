import { Router } from 'express';
import { createRoom, getMyRooms } from '../controllers/room.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const roomRouter = Router();

roomRouter.use(authenticate); // Yêu cầu đăng nhập mới được dùng

roomRouter.post('/', createRoom); // POST /api/v1/rooms
roomRouter.get('/', getMyRooms);  // GET /api/v1/rooms