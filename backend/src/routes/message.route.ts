import { Router } from 'express';
import {
  getMessages,
  createMessage,
} from '../controllers/message.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

// mergeParams: true để nhận :roomId từ parent router (roomRouter.use('/:roomId', messageRouter))
export const messageRouter = Router({ mergeParams: true });

// Tất cả route tin nhắn đều yêu cầu đăng nhập
messageRouter.use(authenticate);

// GET /api/v1/rooms/:roomId/messages - Lấy lịch sử chat
messageRouter.get('/messages', getMessages);

// POST /api/v1/rooms/:roomId/messages - Gửi tin nhắn mới
messageRouter.post('/messages', createMessage);
