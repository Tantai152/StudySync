import { Router } from 'express';
import {
  createRoom,
  getMyRooms,
  getMembers,
  kickMember,
  leaveRoom,
} from '../controllers/room.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { messageRouter } from './message.route.js';
import studySessionRouter from './studySession.route.js';

export const roomRouter = Router();

roomRouter.use(authenticate); // Yêu cầu đăng nhập mới được dùng

roomRouter.post('/', createRoom); // POST /api/v1/rooms
roomRouter.get('/', getMyRooms);  // GET /api/v1/rooms

// Thành viên phòng
roomRouter.get('/:id/members', getMembers);                 // GET /api/v1/rooms/:id/members
roomRouter.delete('/:id/members/:userId', kickMember);      // DELETE /api/v1/rooms/:id/members/:userId
roomRouter.delete('/:id/members/me', leaveRoom);            // DELETE /api/v1/rooms/:id/members/me

// Tin nhắn (mount vào roomRouter)
roomRouter.use('/:roomId', messageRouter);                  // GET/POST /api/v1/rooms/:roomId/messages

// Study session (mount vào roomRouter)
roomRouter.use('/:roomId/sessions', studySessionRouter);    // GET/POST/PATCH /api/v1/rooms/:roomId/sessions/*