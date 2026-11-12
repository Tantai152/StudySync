import { Router } from 'express';
import {
  createRoom,
  getMyRooms,
  getMembers,
  kickMember,
  leaveRoom,
  deleteRoom,
} from '../controllers/room.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { uploadAudio } from '../middleware/upload.middleware.js';
import { transcribeRoomAudio } from '../controllers/transcription.controller.js';
import { getRoomSummary } from '../controllers/summary.controller.js';
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
roomRouter.delete('/:id', deleteRoom);                      // DELETE /api/v1/rooms/:id (chủ phòng xóa)

// Tin nhắn (mount vào roomRouter)
roomRouter.use('/:roomId', messageRouter);                  // GET/POST /api/v1/rooms/:roomId/messages

// Study session (mount vào roomRouter)
roomRouter.use('/:roomId/sessions', studySessionRouter);    // GET/POST/PATCH /api/v1/rooms/:roomId/sessions/*

// Speech-to-text: nhận 1 đoạn audio và lưu text vào bảng Transcription
roomRouter.post('/:roomId/transcribe', uploadAudio, transcribeRoomAudio); // POST /api/v1/rooms/:roomId/transcribe

// Tóm tắt AI mới nhất của phòng (sinh ra khi phòng vắng 2 phút)
roomRouter.get('/:roomId/summary', getRoomSummary); // GET /api/v1/rooms/:roomId/summary