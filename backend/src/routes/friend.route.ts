import { Router } from 'express';
import { 
  searchUsers, 
  sendFriendRequest, 
  getRequests, 
  respondRequest, 
  getFriends 
} from '../controllers/friend.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const friendRouter = Router();

// Tất cả các route bên dưới đều yêu cầu đăng nhập
friendRouter.use(authenticate);

// --- CÁC ROUTE CŨ (Task trước) ---
friendRouter.get('/users', searchUsers);
friendRouter.post('/friend-requests', sendFriendRequest);

// --- CÁC ROUTE MỚI (Task hôm nay) ---
friendRouter.get('/friend-requests', getRequests); // Lấy danh sách lời mời đang chờ
friendRouter.patch('/friend-requests/:id', respondRequest); // Chấp nhận/Từ chối
friendRouter.get('/friends', getFriends); // Lấy danh sách bạn bè