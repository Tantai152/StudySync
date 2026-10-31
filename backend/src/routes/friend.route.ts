import { Router } from 'express';
import { searchUsers, sendFriendRequest } from '../controllers/friend.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const friendRouter = Router();

// Tất cả các route bên dưới đều yêu cầu đăng nhập
friendRouter.use(authenticate);

// GET /users?query=... (Tìm kiếm)
friendRouter.get('/users', searchUsers);

// POST /friend-requests (Gửi lời mời)
friendRouter.post('/friend-requests', sendFriendRequest);